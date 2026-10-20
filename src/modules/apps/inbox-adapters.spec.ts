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
			getMedia: jest
				.fn()
				.mockResolvedValue({
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
			getAttachment: jest
				.fn()
				.mockResolvedValue({
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
});
