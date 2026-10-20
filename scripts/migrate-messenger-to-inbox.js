/**
 * Copies the Messenger chats and messages into the central inbox
 * (inbox_conversations / inbox_messages), keeping the same _ids.
 *
 *   node scripts/migrate-messenger-to-inbox.js            dry run: only counts
 *   node scripts/migrate-messenger-to-inbox.js --apply    writes
 *
 * Safe to run again: documents are inserted by _id and never overwritten, and the
 * old collections are left untouched. After the copy, the Messenger (FACEBOOK)
 * entry of `customer.externalSources` is removed from the customers whose chat now
 * carries the link.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const KIND_BY_TYPE = {
	image: 'IMAGE',
	video: 'VIDEO',
	audio: 'AUDIO',
	file: 'FILE',
	location: 'LOCATION',
};
const kindOf = (type) => (type ? KIND_BY_TYPE[type] || 'OTHER' : 'TEXT');

const conversationOf = (chat) => ({
	_id: chat._id,
	ownerUserId: chat.ownerUserId,
	channel: 'MESSENGER',
	contactKey: chat.psid,
	accountKey: chat.pageId ?? null,
	contact: {
		name: chat.name ?? null,
		username: null,
		profilePic: chat.profilePic ?? null,
		languageCode: null,
		extra: {},
	},
	customerId: chat.customerId ?? null,
	customerChangedAt: chat.customerId ? chat.updatedAt ?? new Date() : null,
	lastMessageAt: chat.lastMessageAt ?? null,
	lastMessageText: chat.lastMessageText ?? null,
	lastMessageKind: chat.lastMessageAt ? kindOf(chat.lastAttachmentType) : null,
	lastMessageChannelKind: chat.lastAttachmentType ?? null,
	lastMessageDirection: chat.lastMessageDirection ?? null,
	lastIncomingAt: chat.lastIncomingAt ?? new Date(0),
	unreadCount: chat.unreadCount ?? 0,
	createdAt: chat.createdAt ?? new Date(),
	updatedAt: chat.updatedAt ?? new Date(),
});

const messageOf = (message, conversationId) => {
	const attachments = message.attachments ?? [];
	const type = attachments[0]?.type ?? message.localAttachment?.type ?? null;
	const isIn = message.direction === 'IN';

	return {
		_id: message._id,
		ownerUserId: message.ownerUserId,
		conversationId,
		channel: 'MESSENGER',
		channelMessageId: message.mid,
		direction: message.direction,
		kind: kindOf(type),
		text: message.text ?? null,
		attachments: attachments.map((attachment) => ({
			kind: kindOf(attachment.type),
			mimeType: null,
			fileName: null,
			size: null,
			width: null,
			height: null,
			duration: null,
			source: { type: 'URL', url: attachment.url },
		})),
		sender: isIn ? { id: message.psid, name: null, username: null } : null,
		sentAt: message.sentAt,
		receivedAt: message.createdAt ?? message.sentAt,
		sentByEmployeeId: message.sentByEmployeeId ?? null,
		status: { deliveredAt: null, readAt: null },
		isEcho: false,
		isUnsupported: false,
		deletedAt: null,
		channelData: {
			attachmentTypes: attachments.map((attachment) => attachment.type),
			...(message.localAttachment
				? { localAttachment: message.localAttachment }
				: {}),
		},
		raw: null, // not kept before the inbox existed
		createdAt: message.createdAt ?? message.sentAt,
	};
};

async function main() {
	const apply = process.argv.includes('--apply');
	await mongoose.connect(process.env.MONGO_URI);
	const db = mongoose.connection.db;

	const chats = await db.collection('messenger_chats').find({}).toArray();
	const conversationIds = new Map();
	let conversationsToInsert = 0;
	let messagesCount = 0;
	let messagesInserted = 0;
	const customerIds = new Set();

	for (const chat of chats) {
		const exists = await db
			.collection('inbox_conversations')
			.findOne({ _id: chat._id }, { projection: { _id: 1 } });
		if (!exists) {
			conversationsToInsert++;
			if (apply) {
				await db
					.collection('inbox_conversations')
					.updateOne(
						{ _id: chat._id },
						{ $setOnInsert: conversationOf(chat) },
						{ upsert: true },
					);
			}
		}
		conversationIds.set(`${chat.ownerUserId}:${chat.psid}`, chat._id);
		if (chat.customerId) {
			customerIds.add(String(chat.customerId));
		}
	}

	let batch = [];
	const flush = async () => {
		if (apply && batch.length) {
			const result = await db
				.collection('inbox_messages')
				.bulkWrite(batch, { ordered: false });
			messagesInserted += result.upsertedCount;
		}
		batch = [];
	};

	for await (const message of db.collection('messenger_messages').find({})) {
		messagesCount++;
		const conversationId = conversationIds.get(
			`${message.ownerUserId}:${message.psid}`,
		);
		if (!conversationId) {
			console.warn(`message ${message._id}: no chat, skipped`);
			continue;
		}
		batch.push({
			updateOne: {
				filter: { _id: message._id },
				update: { $setOnInsert: messageOf(message, conversationId) },
				upsert: true,
			},
		});
		if (batch.length >= 500) await flush();
	}
	await flush();

	let customersCleaned = 0;
	if (apply && customerIds.size) {
		const result = await db.collection('customers').updateMany(
			{
				_id: {
					$in: [...customerIds].map((id) => new mongoose.Types.ObjectId(id)),
				},
			},
			{ $pull: { externalSources: { appId: 'FACEBOOK' } } },
		);
		customersCleaned = result.modifiedCount;
	}

	console.log(
		JSON.stringify(
			{
				mode: apply ? 'APPLY' : 'DRY RUN',
				chats: chats.length,
				conversationsToInsert,
				messages: messagesCount,
				messagesInserted: apply ? messagesInserted : 'n/a (dry run)',
				customersWithLink: customerIds.size,
				customersCleaned: apply ? customersCleaned : 'n/a (dry run)',
			},
			null,
			2,
		),
	);
	await mongoose.disconnect();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
