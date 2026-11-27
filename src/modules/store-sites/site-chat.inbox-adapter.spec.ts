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

	const media: any = {
		store: jest.fn().mockResolvedValue({
			kind: InboxEnum.MessageKind.IMAGE,
			mimeType: 'image/png',
			fileName: 'foto.png',
			size: 10,
			width: null,
			height: null,
			duration: null,
			source: { type: InboxEnum.AttachmentSourceType.STORED_FILE, key: 'k' },
		}),
		read: jest.fn().mockResolvedValue({
			buffer: Buffer.from('x'),
			contentType: 'image/png',
			fileName: 'foto.png',
		}),
	};

	const typing: any = { mark: jest.fn(), clear: jest.fn() };

	const edition: any = {
		edit: jest.fn().mockResolvedValue({ _id: 'm1', text: 'novo' }),
	};

	const deletion: any = { remove: jest.fn().mockResolvedValue(undefined) };

	return {
		registry,
		media,
		conversations,
		messages,
		typing,
		edition,
		deletion,
		adapter: new SiteChatInboxAdapter(
			registry,
			conversations,
			messages,
			media,
			typing,
			edition,
			deletion,
		),
	};
};

describe('SiteChatInboxAdapter', () => {
	it('joins the inbox as the site channel, with files and recordings, always open to an answer', () => {
		const { adapter, registry } = build();

		adapter.onModuleInit();

		expect(registry.register).toHaveBeenCalledWith(adapter);
		expect(adapter.channel).toBe(InboxEnum.Channel.SITE);
		expect(adapter.capabilities).toMatchObject({
			text: true,
			media: true,
			voice: true,
		});
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

	it('sends a file of the store to the visitor, its words as the caption', async () => {
		const { adapter, messages, conversations, media } = build();

		const conversation: any = { _id: 'c1', channel: InboxEnum.Channel.SITE };
		const file = {
			buffer: Buffer.from('x'),
			fileName: 'foto.png',
			mimeType: 'image/png',
		};

		await adapter.sendMedia(
			{ ownerUserId: 'owner', employeeId: null },
			conversation,
			file,
			{ caption: 'Olha a foto', asVoice: false },
		);

		expect(media.store).toHaveBeenCalledWith(file, false);
		expect(messages.saveOutgoing.mock.calls[0][2]).toMatchObject({
			kind: InboxEnum.MessageKind.IMAGE,
			text: 'Olha a foto',
			attachments: [expect.objectContaining({ fileName: 'foto.png' })],
		});
		expect(conversations.applyOutgoing.mock.calls[0][2]).toMatchObject({
			kind: InboxEnum.MessageKind.IMAGE,
			text: 'Olha a foto',
		});
	});

	it('reads a file of a message back from the chat storage', async () => {
		const { adapter, media } = build();
		const message: any = { _id: 'm1', attachments: [] };

		const file = await adapter.fetchAttachment('owner', {} as any, message, 0);

		expect(media.read).toHaveBeenCalledWith(message, 0);
		expect(file.contentType).toBe('image/png');
	});

	it('lets the visitor see the store writing, and stops when it answers', async () => {
		const { adapter, typing } = build();
		const conversation: any = { _id: 'c1', channel: InboxEnum.Channel.SITE };

		await adapter.sendTyping(
			{ ownerUserId: 'owner', employeeId: null },
			conversation,
		);

		expect(typing.mark).toHaveBeenCalledWith('c1');

		await adapter.sendText(
			{ ownerUserId: 'owner', employeeId: null },
			conversation,
			'Oi!',
		);

		expect(typing.clear).toHaveBeenCalledWith('c1');
	});

	describe('editing and removing', () => {
		const conversation: any = { _id: 'c1', ownerUserId: 'o1' };

		it('lets the store change and remove only its own messages', () => {
			const { adapter } = build();

			expect(
				adapter.canEditMessage({ direction: InboxEnum.Direction.OUT } as any),
			).toBe(true);
			expect(
				adapter.canEditMessage({ direction: InboxEnum.Direction.IN } as any),
			).toBe(false);
			expect(
				adapter.canDeleteMessage({ direction: InboxEnum.Direction.IN } as any),
			).toBe(false);
		});

		it('changes the words as the store', async () => {
			const { adapter, edition } = build();

			await adapter.editMessage(
				'o1',
				conversation,
				{ _id: 'm1' } as any,
				' novo ',
			);

			expect(edition.edit).toHaveBeenCalledWith(
				conversation,
				'm1',
				InboxEnum.Direction.OUT,
				'novo',
			);
		});

		it('removes as the store', async () => {
			const { adapter, deletion } = build();

			await adapter.deleteMessage('o1', conversation, { _id: 'm1' } as any);

			expect(deletion.remove).toHaveBeenCalledWith(
				conversation,
				'm1',
				InboxEnum.Direction.OUT,
			);
		});
	});
});
