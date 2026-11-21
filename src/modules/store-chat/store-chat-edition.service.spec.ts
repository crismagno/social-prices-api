import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { StoreChatEditionService } from './store-chat-edition.service';

const OWNER = '507f1f77bcf86cd799439099';
const ACCOUNT = '507f1f77bcf86cd799439011';
const STORE = '507f1f77bcf86cd799439021';
const CONV = '507f1f77bcf86cd799439031';
const MSG = '507f1f77bcf86cd799439051';
const OTHER = '507f1f77bcf86cd799439052';

const conversation = (over: any = {}): any => ({
	_id: CONV,
	ownerUserId: OWNER,
	accountKey: STORE,
	contactUserId: ACCOUNT,
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

const build = (message: any = stored(), latestId: string | null = MSG) => {
	const messages: any = {
		findOwned: jest.fn().mockResolvedValue(message),
		editText: jest
			.fn()
			.mockImplementation(
				async (_owner: string, _conv: string, _id: string, text: string) => ({
					...message,
					text,
					editedAt: new Date('2030-01-06'),
				}),
			),
		findLatest: jest
			.fn()
			.mockResolvedValue(latestId ? { _id: latestId } : null),
	};
	const conversations: any = {
		setPreview: jest.fn().mockResolvedValue(undefined),
	};
	const realtime: any = { notifyStoreChatUpdated: jest.fn() };

	return {
		messages,
		conversations,
		realtime,
		service: new StoreChatEditionService(messages, conversations, realtime),
	};
};

describe('StoreChatEditionService.edit', () => {
	it('changes the words, marks the message as edited and gives it back', async () => {
		const { service, messages } = build();

		const edited = await service.edit(
			conversation(),
			MSG,
			'IN' as any,
			'oi, tudo bem?',
		);

		expect(messages.editText).toHaveBeenCalledWith(
			OWNER,
			CONV,
			MSG,
			'oi, tudo bem?',
		);
		expect(edited).toMatchObject({
			_id: MSG,
			text: 'oi, tudo bem?',
			editedAt: new Date('2030-01-06'),
		});
	});

	it('tells both sides, so the open pages show the new words', async () => {
		const { service, realtime } = build();

		await service.edit(conversation(), MSG, 'IN' as any, 'novo');

		const event = { storeId: STORE, conversationId: CONV };
		expect(realtime.notifyStoreChatUpdated).toHaveBeenCalledWith(OWNER, event);
		expect(realtime.notifyStoreChatUpdated).toHaveBeenCalledWith(
			ACCOUNT,
			event,
		);
	});

	it('tells only the store when the conversation has no account on the other side', async () => {
		const { service, realtime } = build();

		await service.edit(
			conversation({ contactUserId: null }),
			MSG,
			'IN' as any,
			'novo',
		);

		expect(realtime.notifyStoreChatUpdated).toHaveBeenCalledTimes(1);
	});

	it('updates what the lists show when the edited message is the newest', async () => {
		const { service, conversations } = build();

		await service.edit(conversation(), MSG, 'IN' as any, 'novo');

		expect(conversations.setPreview).toHaveBeenCalledWith(OWNER, CONV, {
			text: 'novo',
			kind: 'TEXT',
			channelKind: null,
			direction: 'IN',
			at: new Date('2030-01-05'),
		});
	});

	it('leaves the lists alone when a newer message exists', async () => {
		const { service, conversations } = build(stored(), OTHER);

		await service.edit(conversation(), MSG, 'IN' as any, 'novo');

		expect(conversations.setPreview).not.toHaveBeenCalled();
	});

	it('changes the caption of a message with a file, keeping its kind in the lists', async () => {
		const { service, conversations } = build(
			stored({ kind: 'IMAGE', text: null, direction: 'OUT' }),
		);

		await service.edit(conversation(), MSG, 'OUT' as any, 'a foto');

		expect(conversations.setPreview).toHaveBeenCalledWith(
			OWNER,
			CONV,
			expect.objectContaining({ text: 'a foto', kind: 'IMAGE' }),
		);
	});

	it('does nothing when the words are the same: nothing was edited', async () => {
		const { service, messages, realtime } = build();

		await expect(
			service.edit(conversation(), MSG, 'IN' as any, 'oi'),
		).resolves.toMatchObject({ _id: MSG, text: 'oi' });
		expect(messages.editText).not.toHaveBeenCalled();
		expect(realtime.notifyStoreChatUpdated).not.toHaveBeenCalled();
	});

	it.each([
		['IN', 'OUT'],
		['OUT', 'IN'],
	])(
		'refuses the side %p changing what the other side (%p) wrote',
		async (by, direction) => {
			const { service, messages } = build(stored({ direction }));

			await expect(
				service.edit(conversation(), MSG, by as any, 'novo'),
			).rejects.toBeInstanceOf(ForbiddenException);
			expect(messages.editText).not.toHaveBeenCalled();
		},
	);

	it('refuses an id that is not an id, without asking the database', async () => {
		const { service, messages } = build();

		await expect(
			service.edit(conversation(), 'nope', 'IN' as any, 'novo'),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(messages.findOwned).not.toHaveBeenCalled();
	});

	it('refuses a message that is not in that conversation', async () => {
		const { service, messages } = build(null);

		await expect(
			service.edit(conversation(), MSG, 'IN' as any, 'novo'),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(messages.findOwned).toHaveBeenCalledWith(OWNER, CONV, MSG);
	});

	it('refuses a message removed while it was being changed', async () => {
		const { service, messages, realtime } = build();
		messages.editText.mockResolvedValue(null);

		await expect(
			service.edit(conversation(), MSG, 'IN' as any, 'novo'),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(realtime.notifyStoreChatUpdated).not.toHaveBeenCalled();
	});
});
