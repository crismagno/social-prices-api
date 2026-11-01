import { InstagramInboxAdapter } from './instagram/instagram.inbox-adapter';
import { MessengerInboxAdapter } from './messenger/messenger.inbox-adapter';
import { TelegramInboxAdapter } from './telegram/telegram.inbox-adapter';

const OWNER = '507f1f77bcf86cd799439011';
const ctx = { ownerUserId: OWNER, employeeId: 'e1' };
const DAY = 24 * 60 * 60 * 1000;

const registry: any = { register: jest.fn() };
const messages: any = {
	findById: jest.fn().mockResolvedValue({ _id: 'out1' }),
};

describe('channel adapters of the central inbox', () => {
	it('each registers itself when its module starts', () => {
		const service: any = {};

		for (const adapter of [
			new TelegramInboxAdapter(registry, service, messages),
			new MessengerInboxAdapter(registry, service, messages),
			new InstagramInboxAdapter(registry, service, messages),
		]) {
			adapter.onModuleInit();
			expect(registry.register).toHaveBeenCalledWith(adapter);
		}
	});

	describe('Telegram', () => {
		const service: any = {
			sendMessage: jest.fn().mockResolvedValue({ _id: 'out1' }),
			sendMedia: jest.fn().mockResolvedValue({ _id: 'out1' }),
			sendTyping: jest.fn().mockResolvedValue(undefined),
			deleteMessage: jest.fn().mockResolvedValue(undefined),
			getMedia: jest.fn().mockResolvedValue({
				buffer: Buffer.alloc(1),
				mimeType: 'image/png',
				fileName: 'a.png',
			}),
		};
		const adapter = new TelegramInboxAdapter(registry, service, messages);
		const conversation: any = { contactKey: '555' };

		it('answers anyone who wrote, any time', () => {
			expect(adapter.canReply()).toEqual({ allowed: true, windowEndsAt: null });
		});

		it('sends by chat id and returns the stored message', async () => {
			await expect(adapter.sendText(ctx, conversation, 'oi')).resolves.toEqual({
				_id: 'out1',
			});
			expect(service.sendMessage).toHaveBeenCalledWith(ctx, 555, 'oi');
			expect(messages.findById).toHaveBeenCalledWith(OWNER, 'out1');
		});

		it('sends a file or a recording with its caption, within the bot size limit', async () => {
			const file = {
				buffer: Buffer.alloc(1),
				fileName: 'a.mp3',
				mimeType: 'audio/mpeg',
			};

			await expect(
				adapter.sendMedia(ctx, conversation, file, {
					caption: 'oi',
					asVoice: true,
				}),
			).resolves.toEqual({ _id: 'out1' });

			expect(service.sendMedia).toHaveBeenCalledWith(
				ctx,
				555,
				file,
				'oi',
				true,
			);
			expect(adapter.capabilities).toMatchObject({
				media: true,
				voice: true,
				maxUploadBytes: 20 * 1024 * 1024,
			});
		});

		it('shows "typing…" in the bot chat', async () => {
			await adapter.sendTyping(ctx, conversation);

			expect(service.sendTyping).toHaveBeenCalledWith(ctx, 555);
		});

		it('deletes the message in the bot chat', async () => {
			await adapter.deleteMessage(OWNER, conversation, { _id: 'm1' } as any);

			expect(service.deleteMessage).toHaveBeenCalledWith(OWNER, 555, 'm1');
			expect(adapter.capabilities.deleteMessage).toBe(true);
		});

		it('fetches the file of a message', async () => {
			const file = await adapter.fetchAttachment(OWNER, conversation, {
				_id: 'm1',
			} as any);

			expect(service.getMedia).toHaveBeenCalledWith(OWNER, 555, 'm1');
			expect(file).toMatchObject({
				contentType: 'image/png',
				fileName: 'a.png',
			});
		});
	});

	describe.each([
		['Messenger', MessengerInboxAdapter],
		['Instagram', InstagramInboxAdapter],
	])('%s', (_name, Adapter: any) => {
		const service: any = {
			sendMessage: jest.fn().mockResolvedValue({ _id: 'out1' }),
			sendTyping: jest.fn().mockResolvedValue(undefined),
			deleteMessage: jest.fn().mockResolvedValue(undefined),
			getAttachment: jest.fn().mockResolvedValue({
				buffer: Buffer.alloc(1),
				contentType: 'image/jpeg',
			}),
		};
		const adapter = new Adapter(registry, service, messages);

		it('allows an answer for 24 hours after the person last wrote', () => {
			const recent = adapter.canReply({
				lastIncomingAt: new Date(Date.now() - DAY / 2),
			});
			const old = adapter.canReply({
				lastIncomingAt: new Date(Date.now() - DAY * 2),
			});

			expect(recent.allowed).toBe(true);
			expect(old.allowed).toBe(false);
			expect(adapter.canReply({ lastIncomingAt: new Date(0) }).allowed).toBe(
				false,
			);
		});

		it('sends by the person id and returns the stored message', async () => {
			await expect(
				adapter.sendText(ctx, { contactKey: 'X1' }, 'oi'),
			).resolves.toEqual({ _id: 'out1' });
			expect(service.sendMessage).toHaveBeenCalledWith(ctx, 'X1', 'oi');
		});

		it('shows "typing…" by the person id', async () => {
			await adapter.sendTyping(ctx, { contactKey: 'X1' });

			expect(service.sendTyping).toHaveBeenCalledWith(ctx, 'X1');
		});

		it('removes a message from the inbox only', async () => {
			expect(adapter.capabilities.deleteMessage).toBe(true);

			if (adapter.deleteMessage) {
				await adapter.deleteMessage(OWNER, { contactKey: 'X1' }, { _id: 'm1' });
				expect(service.deleteMessage).toHaveBeenCalledWith(OWNER, 'X1', 'm1');
			}
		});

		it('fetches a file by its index', async () => {
			const file = await adapter.fetchAttachment(
				OWNER,
				{ contactKey: 'X1' },
				{ _id: 'm1' },
				2,
			);

			expect(service.getAttachment).toHaveBeenCalledWith(OWNER, 'X1', 'm1', 2);
			expect(file).toEqual(
				expect.objectContaining({ contentType: 'image/jpeg', fileName: null }),
			);
		});
	});

	describe('files and recordings', () => {
		const file = {
			buffer: Buffer.alloc(1),
			fileName: 'a.wav',
			mimeType: 'audio/wav',
		};
		const conversation: any = { contactKey: 'X1' };

		it('Messenger sends the file, then the text as a message of its own (a file has no caption)', async () => {
			const service: any = {
				sendAttachment: jest.fn().mockResolvedValue({ _id: 'out1' }),
				sendMessage: jest.fn().mockResolvedValue({ _id: 'out2' }),
			};
			const adapter = new MessengerInboxAdapter(registry, service, messages);

			await expect(
				adapter.sendMedia(ctx, conversation, file, {
					caption: 'oi',
					asVoice: true,
				}),
			).resolves.toEqual({ _id: 'out1' });

			expect(service.sendAttachment).toHaveBeenCalledWith(ctx, 'X1', file);
			expect(service.sendMessage).toHaveBeenCalledWith(ctx, 'X1', 'oi');
			expect(adapter.capabilities).toMatchObject({
				media: true,
				voice: true,
				maxUploadBytes: 25 * 1024 * 1024,
			});

			service.sendMessage.mockClear();
			await adapter.sendMedia(ctx, conversation, file, {
				caption: null,
				asVoice: false,
			});
			expect(service.sendMessage).not.toHaveBeenCalled();
		});

		it('Instagram takes text only', () => {
			const adapter: any = new InstagramInboxAdapter(
				registry,
				{} as any,
				messages,
			);

			expect(adapter.capabilities).toMatchObject({
				media: false,
				voice: false,
				maxUploadBytes: null,
			});
			expect(adapter.sendMedia).toBeUndefined();
		});
	});
});
