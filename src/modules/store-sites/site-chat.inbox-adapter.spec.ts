import InboxEnum from '../inbox/interfaces/inbox.enum';
import { SiteChatInboxAdapter } from './site-chat.inbox-adapter';

const build = () => {
	const registry: any = { register: jest.fn() };
	const conversations: any = {
		applyOutgoing: jest.fn().mockResolvedValue(undefined),
	};
	const messages: any = {
		saveOutgoing: jest
			.fn()
			.mockImplementation((_owner: string, _conversation: any, input: any) =>
				Promise.resolve({ _id: 'saved', ...input }),
			),
	};

	return {
		registry,
		conversations,
		messages,
		adapter: new SiteChatInboxAdapter(registry, conversations, messages),
	};
};

describe('SiteChatInboxAdapter', () => {
	it('joins the inbox as the site channel, text only, always open to an answer', () => {
		const { adapter, registry } = build();

		adapter.onModuleInit();

		expect(registry.register).toHaveBeenCalledWith(adapter);
		expect(adapter.channel).toBe(InboxEnum.Channel.SITE);
		expect(adapter.capabilities).toMatchObject({ text: true, media: false });
		expect(adapter.canReply()).toEqual({ allowed: true, windowEndsAt: null });
	});

	it('records the answer of the store where the visitor reads it, and moves the preview', async () => {
		const { adapter, messages, conversations } = build();

		const conversation: any = { _id: 'c1', channel: InboxEnum.Channel.SITE };

		const saved = await adapter.sendText(
			{ ownerUserId: 'owner', employeeId: 'e1' },
			conversation,
			'Fazemos sim!',
		);

		const [ownerUserId, savedTo, input] = messages.saveOutgoing.mock.calls[0];

		expect(ownerUserId).toBe('owner');
		expect(savedTo).toBe(conversation);
		expect(input).toMatchObject({
			kind: InboxEnum.MessageKind.TEXT,
			text: 'Fazemos sim!',
			sentByEmployeeId: 'e1',
		});
		expect(conversations.applyOutgoing).toHaveBeenCalledWith('owner', 'c1', {
			text: 'Fazemos sim!',
			kind: InboxEnum.MessageKind.TEXT,
			channelKind: null,
			direction: InboxEnum.Direction.OUT,
			at: input.sentAt,
		});
		expect(saved).toMatchObject({ _id: 'saved', text: 'Fazemos sim!' });
	});
});
