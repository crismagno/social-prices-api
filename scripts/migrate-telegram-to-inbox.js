/**
 * Copies the Telegram chats and messages into the central inbox
 * (inbox_conversations / inbox_messages), keeping the same _ids.
 *
 *   node scripts/migrate-telegram-to-inbox.js            dry run: only counts
 *   node scripts/migrate-telegram-to-inbox.js --apply    writes
 *
 * Safe to run again: documents are inserted by _id and never overwritten, and the
 * old collections are left untouched. After the copy, the Telegram entry of
 * `customer.externalSources` is removed from the customers whose chat now carries
 * the link.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const KIND_BY_CONTENT_TYPE = {
	TEXT: 'TEXT',
	PHOTO: 'IMAGE',
	DOCUMENT: 'FILE',
	VOICE: 'VOICE',
	AUDIO: 'AUDIO',
	VIDEO: 'VIDEO',
	VIDEO_NOTE: 'VIDEO',
	STICKER: 'STICKER',
	LOCATION: 'LOCATION',
	CONTACT: 'CONTACT',
	OTHER: 'OTHER',
};
const kindOf = (contentType) => KIND_BY_CONTENT_TYPE[contentType] || 'OTHER';
const fullName = (first, last) =>
	[first, last].filter(Boolean).join(' ') || null;

const conversationOf = (chat) => ({
	_id: chat._id,
	ownerUserId: chat.ownerUserId,
	channel: 'TELEGRAM',
	contactKey: String(chat.chatId),
	accountKey: null,
	contact: {
		name: fullName(chat.firstName, chat.lastName),
		username: chat.username ?? null,
		profilePic: null,
		languageCode: chat.languageCode ?? null,
		extra: {
			telegramUserId: chat.telegramUserId,
			firstName: chat.firstName ?? null,
			lastName: chat.lastName ?? null,
		},
	},
	customerId: chat.customerId ?? null,
	customerChangedAt: chat.customerId ? chat.updatedAt ?? new Date() : null,
	lastMessageAt: chat.lastMessageAt ?? null,
	lastMessageText: chat.lastMessageText ?? null,
	lastMessageKind: chat.lastContentType ? kindOf(chat.lastContentType) : null,
	lastMessageChannelKind: chat.lastContentType ?? null,
	lastMessageDirection: chat.lastMessageDirection ?? null,
	lastIncomingAt:
		chat.lastMessageDirection === 'IN' ? chat.lastMessageAt : new Date(0),
	unreadCount: chat.unreadCount ?? 0,
	createdAt: chat.createdAt ?? new Date(),
	updatedAt: chat.updatedAt ?? new Date(),
});

const messageOf = (message, conversationId) => {
	const media = message.media;
	const isIn = message.direction === 'IN';

	return {
		_id: message._id,
		ownerUserId: message.ownerUserId,
		conversationId,
		channel: 'TELEGRAM',
		channelMessageId: String(message.messageId),
		direction: message.direction,
		kind: kindOf(message.contentType),
		text: message.text ?? null,
		attachments: media
			? [
					{
						kind: kindOf(message.contentType),
						mimeType: media.mimeType ?? null,
						fileName: media.fileName ?? null,
						size: media.size ?? null,
						width: media.width ?? null,
						height: media.height ?? null,
						duration: media.duration ?? null,
						source: { type: 'TELEGRAM_FILE', fileId: media.fileId },
					},
			  ]
			: [],
		sender: isIn
			? {
					id: String(message.fromUserId),
					name: fullName(message.fromFirstName, message.fromLastName),
					username: message.fromUsername ?? null,
			  }
			: null,
		sentAt: message.sentAt,
		receivedAt: message.createdAt ?? message.sentAt,
		sentByEmployeeId: message.sentByEmployeeId ?? null,
		status: { deliveredAt: null, readAt: null },
		isEcho: false,
		isUnsupported: false,
		deletedAt: null,
		channelData: {
			contentType: message.contentType,
			...(isIn
				? {
						updateId: message.updateId ?? null,
						fromLanguageCode: message.fromLanguageCode ?? null,
				  }
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

	const chats = await db.collection('telegram_chats').find({}).toArray();
	const chatsById = new Map();
	let conversationsToInsert = 0;
	let messagesCount = 0;
	let messagesToInsert = 0;
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
		chatsById.set(`${chat.ownerUserId}:${chat.chatId}`, chat._id);
		if (chat.customerId) {
			customerIds.add(String(chat.customerId));
		}
	}

	const cursor = db.collection('telegram_messages').find({});
	let batch = [];
	const flush = async () => {
		if (apply && batch.length) {
			const result = await db
				.collection('inbox_messages')
				.bulkWrite(batch, { ordered: false });
			messagesToInsert += result.upsertedCount;
		}
		batch = [];
	};

	for await (const message of cursor) {
		messagesCount++;
		const conversationId = chatsById.get(
			`${message.ownerUserId}:${message.chatId}`,
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
			{ $pull: { externalSources: { appId: 'TELEGRAM' } } },
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
				messagesInserted: apply ? messagesToInsert : 'n/a (dry run)',
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
