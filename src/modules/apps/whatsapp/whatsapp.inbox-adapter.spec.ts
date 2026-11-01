import { WhatsappInboxAdapter } from './whatsapp.inbox-adapter';

const OWNER = '507f1f77bcf86cd799439011';
const ctx = { ownerUserId: OWNER, employeeId: 'e1' };
const DAY = 24 * 3600_000;

const build = () => {
	const registry: any = { register: jest.fn() };
	const service: any = {
		sendText: jest.fn().mockResolvedValue({ _id: 'out1' }),
		sendMedia: jest.fn().mockResolvedValue({ _id: 'out2' }),
		getAttachment: jest.fn().mockResolvedValue({
			buffer: Buffer.alloc(1),
			contentType: 'image/png',
			fileName: null,
		}),
	};

	return {
		registry,
		service,
		adapter: new WhatsappInboxAdapter(registry, service),
	};
};

describe('WhatsappInboxAdapter', () => {
	it('registers itself when its module starts', () => {
		const { adapter, registry } = build();

		adapter.onModuleInit();

		expect(registry.register).toHaveBeenCalledWith(adapter);
	});

	it('takes text, files and recordings, within 16 MB, and cannot delete a message', () => {
		expect(build().adapter.capabilities).toMatchObject({
			text: true,
			media: true,
			voice: true,
			maxUploadBytes: 16 * 1024 * 1024,
			deleteMessage: false,
		});
		expect((build().adapter as any).deleteMessage).toBeUndefined();
	});

	it('allows an answer for 24 hours after the person last wrote', () => {
		const { adapter } = build();

		const recent = adapter.canReply({
			lastIncomingAt: new Date(Date.now() - DAY / 2),
		} as any);
		const old = adapter.canReply({
			lastIncomingAt: new Date(Date.now() - DAY * 2),
		} as any);

		expect(recent.allowed).toBe(true);
		expect(old.allowed).toBe(false);
		expect(
			adapter.canReply({ lastIncomingAt: new Date(0) } as any).allowed,
		).toBe(false);
	});

	it('sends text and files by the phone number of the conversation', async () => {
		const { adapter, service } = build();
		const conversation: any = { contactKey: '5585988887777' };
		const file = {
			buffer: Buffer.alloc(1),
			fileName: 'a.mp3',
			mimeType: 'audio/mpeg',
		};

		await expect(adapter.sendText(ctx, conversation, 'oi')).resolves.toEqual({
			_id: 'out1',
		});
		await expect(
			adapter.sendMedia(ctx, conversation, file, {
				caption: 'x',
				asVoice: true,
			}),
		).resolves.toEqual({ _id: 'out2' });

		expect(service.sendText).toHaveBeenCalledWith(ctx, '5585988887777', 'oi');
		expect(service.sendMedia).toHaveBeenCalledWith(
			ctx,
			'5585988887777',
			file,
			'x',
			true,
		);
	});

	it('fetches a file by its index', async () => {
		const { adapter, service } = build();
		const message: any = { _id: 'm1' };

		const file = await adapter.fetchAttachment(OWNER, {} as any, message, 2);

		expect(service.getAttachment).toHaveBeenCalledWith(OWNER, message, 2);
		expect(file.contentType).toBe('image/png');
	});
});
