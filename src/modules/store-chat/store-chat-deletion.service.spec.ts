import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { StoreChatDeletionService } from './store-chat-deletion.service';

const OWNER = '507f1f77bcf86cd799439099';
const ACCOUNT = '507f1f77bcf86cd799439011';
const STORE = '507f1f77bcf86cd799439021';
const CONV = '507f1f77bcf86cd799439031';
const MSG = '507f1f77bcf86cd799439051';

const conversation = (over: any = {}): any => ({
	_id: CONV,
	ownerUserId: OWNER,
	accountKey: STORE,
	contactUserId: ACCOUNT,
	lastMessageAt: new Date('2030-01-05'),
	...over,
});

const stored = (over: any = {}): any => ({
	_id: MSG,
	direction: 'IN',
	kind: 'TEXT',
	text: 'oi',
	sentAt: new Date('2030-01-05'),
	...over,
});

const build = (message: any = stored(), latest: any = null) => {
	const messages: any = {
		findOwned: jest.fn().mockResolvedValue(message),
		softDeleteOwned: jest.fn().mockResolvedValue(true),
		findLatest: jest.fn().mockResolvedValue(latest),
	};
	const conversations: any = {
		setPreview: jest.fn().mockResolvedValue(undefined),
	};
	const realtime: any = { notifyStoreChatUpdated: jest.fn() };
	const media: any = { removeFilesOf: jest.fn().mockResolvedValue(undefined) };

	return {
		messages,
		conversations,
		realtime,
		media,
		service: new StoreChatDeletionService(
			messages,
			conversations,
			realtime,
			media,
		),
	};
};

describe('StoreChatDeletionService.remove', () => {
	it('refuses an id that is not an id, without asking the database', async () => {
		const { service, messages } = build();

		await expect(
			service.remove(conversation(), 'nope', 'IN' as any),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(messages.findOwned).not.toHaveBeenCalled();
	});

	it('refuses a message that is not in that conversation', async () => {
		const { service, messages } = build(null);

		await expect(
			service.remove(conversation(), MSG, 'IN' as any),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(messages.findOwned).toHaveBeenCalledWith(OWNER, CONV, MSG);
		expect(messages.softDeleteOwned).not.toHaveBeenCalled();
	});

	it.each([
		['IN', 'OUT'],
		['OUT', 'IN'],
	])(
		'refuses the side %p removing what the other side (%p) wrote',
		async (by, direction) => {
			const { service, messages } = build(stored({ direction }));

			const error = await service
				.remove(conversation(), MSG, by as any)
				.catch((thrown) => thrown);

			expect(error).toBeInstanceOf(ForbiddenException);
			expect(error.getResponse()).toMatchObject({
				code: 'STORE_CHAT_NOT_YOUR_MESSAGE',
			});
			expect(messages.softDeleteOwned).not.toHaveBeenCalled();
		},
	);

	it('takes the message out for both sides and tells both', async () => {
		const { service, messages, realtime } = build();

		await service.remove(conversation(), MSG, 'IN' as any);

		expect(messages.softDeleteOwned).toHaveBeenCalledWith(OWNER, CONV, MSG);
		expect(realtime.notifyStoreChatUpdated).toHaveBeenCalledWith(OWNER, {
			storeId: STORE,
			conversationId: CONV,
		});
		expect(realtime.notifyStoreChatUpdated).toHaveBeenCalledWith(ACCOUNT, {
			storeId: STORE,
			conversationId: CONV,
		});
	});

	it('takes the files of the message out of the storage', async () => {
		const withFile = stored({
			attachments: [{ source: { type: 'STORED_FILE', key: 'a.png' } }],
		});
		const { service, media } = build(withFile);

		await service.remove(conversation(), MSG, 'IN' as any);

		expect(media.removeFilesOf).toHaveBeenCalledWith(withFile);
	});

	it('keeps the files of a message it refused to remove', async () => {
		const { service, media } = build(stored({ direction: 'OUT' }));

		await service.remove(conversation(), MSG, 'IN' as any).catch(() => null);

		expect(media.removeFilesOf).not.toHaveBeenCalled();
	});

	it('moves the preview to what is now the newest message', async () => {
		const latest = stored({
			_id: 'm0',
			direction: 'OUT',
			text: 'antes',
			sentAt: new Date('2030-01-04'),
		});
		const { service, conversations } = build(stored(), latest);

		await service.remove(conversation(), MSG, 'IN' as any);

		expect(conversations.setPreview).toHaveBeenCalledWith(OWNER, CONV, {
			text: 'antes',
			kind: 'TEXT',
			channelKind: null,
			direction: 'OUT',
			at: new Date('2030-01-04'),
		});
	});

	it('leaves an empty preview, in place, when nothing is left', async () => {
		const { service, conversations } = build(stored(), null);

		await service.remove(conversation(), MSG, 'IN' as any);

		expect(conversations.setPreview).toHaveBeenCalledWith(OWNER, CONV, {
			text: null,
			kind: 'TEXT',
			channelKind: null,
			direction: 'IN',
			at: new Date('2030-01-05'),
		});
	});

	it('says not found when it was already removed', async () => {
		const { service, messages, realtime } = build();

		messages.softDeleteOwned.mockResolvedValue(false);

		await expect(
			service.remove(conversation(), MSG, 'IN' as any),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(realtime.notifyStoreChatUpdated).not.toHaveBeenCalled();
	});
});
