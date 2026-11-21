import { StoreChatInboxAdapter } from './store-chat.inbox-adapter';

const build = () => {
	const registry: any = { register: jest.fn() };
	const owner: any = { sendText: jest.fn().mockResolvedValue({ _id: 'm1' }) };

	return {
		registry,
		owner,
		adapter: new StoreChatInboxAdapter(registry, owner),
	};
};

describe('StoreChatInboxAdapter', () => {
	it('announces itself as the STORE channel when the module starts', () => {
		const { adapter, registry } = build();

		adapter.onModuleInit();

		expect(adapter.channel).toBe('STORE');
		expect(registry.register).toHaveBeenCalledWith(adapter);
	});

	it('takes text, files and recordings, with no answer window', () => {
		const { adapter } = build();

		expect(adapter.capabilities).toEqual({
			text: true,
			media: true,
			voice: true,
			maxUploadBytes: 16 * 1024 * 1024,
			deleteMessage: true,
			editMessage: true,
			answerWindowMs: null,
		});
		expect(adapter.canReply()).toEqual({ allowed: true, windowEndsAt: null });
	});

	it('answers through the store chat', async () => {
		const { adapter, owner } = build();
		const ctx: any = { ownerUserId: 'o', employeeId: null };
		const conversation: any = { _id: 'c1' };

		await expect(adapter.sendText(ctx, conversation, 'oi')).resolves.toEqual({
			_id: 'm1',
		});
		expect(owner.sendText).toHaveBeenCalledWith(ctx, conversation, 'oi');
	});

	it('lets only the store own messages be removed', async () => {
		const { adapter, owner } = build();
		const conversation: any = { _id: 'c1' };
		const mine: any = { _id: 'm1', direction: 'OUT' };

		owner.deleteMessage = jest.fn().mockResolvedValue(undefined);

		expect(adapter.canDeleteMessage(mine)).toBe(true);
		expect(adapter.canDeleteMessage({ direction: 'IN' } as any)).toBe(false);

		await adapter.deleteMessage('o', conversation, mine);

		expect(owner.deleteMessage).toHaveBeenCalledWith(conversation, mine);
	});

	it('lets only the store own messages have their words changed', async () => {
		const { adapter, owner } = build();
		const conversation: any = { _id: 'c1' };
		const mine: any = { _id: 'm1', direction: 'OUT' };

		owner.editMessage = jest.fn().mockResolvedValue({ _id: 'm1', text: 'oi' });

		expect(adapter.canEditMessage(mine)).toBe(true);
		expect(adapter.canEditMessage({ direction: 'IN' } as any)).toBe(false);
		expect(
			adapter.canEditMessage({ direction: 'OUT', isUnsupported: true } as any),
		).toBe(false);

		await expect(
			adapter.editMessage('o', conversation, mine, 'oi'),
		).resolves.toEqual({ _id: 'm1', text: 'oi' });

		expect(owner.editMessage).toHaveBeenCalledWith(conversation, mine, 'oi');
	});

	it('passes "typing" on to the account', async () => {
		const { adapter, owner } = build();
		const conversation: any = { _id: 'c1' };

		owner.typing = jest.fn();

		await adapter.sendTyping({} as any, conversation);

		expect(owner.typing).toHaveBeenCalledWith(conversation);
	});

	it('sends and reads files through the store chat', async () => {
		const { adapter, owner } = build();
		const ctx: any = { ownerUserId: 'o', employeeId: null };
		const conversation: any = { _id: 'c1' };
		const file: any = { buffer: Buffer.from('a') };
		const options = { caption: 'oi', asVoice: true };
		const message: any = { _id: 'm1' };

		owner.sendMedia = jest.fn().mockResolvedValue({ _id: 'm2' });
		owner.getAttachment = jest.fn().mockResolvedValue({ contentType: 'x' });

		await expect(
			adapter.sendMedia(ctx, conversation, file, options),
		).resolves.toEqual({ _id: 'm2' });
		expect(owner.sendMedia).toHaveBeenCalledWith(
			ctx,
			conversation,
			file,
			options,
		);

		await adapter.fetchAttachment('o', conversation, message, 2);

		expect(owner.getAttachment).toHaveBeenCalledWith(message, 2);
	});
});
