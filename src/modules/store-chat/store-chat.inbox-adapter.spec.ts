import { NotFoundException } from '@nestjs/common';

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

	it('takes text only, with no answer window', () => {
		const { adapter } = build();

		expect(adapter.capabilities).toEqual({
			text: true,
			media: false,
			voice: false,
			maxUploadBytes: null,
			deleteMessage: false,
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

	it('has no files to give', async () => {
		const { adapter } = build();

		await expect(adapter.fetchAttachment()).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});
});
