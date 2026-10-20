import { InstagramMessagesService } from './instagram-messages.service';

const OWNER = '507f1f77bcf86cd799439011';
const CONV = { _id: 'c1' };
const KEY = { channel: 'INSTAGRAM', contactKey: 'IGSID1' };

const incoming = (over: any = {}): any => ({
	accountId: 'ACCOUNT1',
	igsid: 'IGSID1',
	direction: 'IN',
	mid: 'm1',
	text: 'oi',
	attachments: [{ type: 'image', url: 'https://cdn.fbsbx.com/a.jpg' }],
	isUnsupported: false,
	sentAt: new Date('2030-01-01'),
	raw: { message: { mid: 'm1' } },
	...over,
});

const stored = (over: any = {}): any => ({
	_id: 'x1',
	direction: 'OUT',
	channelMessageId: 'm9',
	kind: 'TEXT',
	text: 'claro',
	attachments: [],
	sentAt: new Date('2030-01-02'),
	sentByEmployeeId: 'e1',
	channelData: { attachmentTypes: [] },
	...over,
});

const build = (found: any = CONV) => {
	const conversations: any = {
		ensure: jest.fn().mockResolvedValue({ conversation: CONV, created: false }),
		findByKey: jest.fn().mockResolvedValue(found),
	};
	const messages: any = {
		saveIncoming: jest.fn().mockResolvedValue(true),
		saveEcho: jest.fn().mockResolvedValue(true),
		saveOutgoing: jest.fn().mockResolvedValue(stored()),
		findOwned: jest.fn().mockResolvedValue(stored()),
		listByConversation: jest.fn().mockResolvedValue([stored()]),
	};

	return {
		conversations,
		messages,
		service: new InstagramMessagesService(conversations, messages),
	};
};

describe('InstagramMessagesService (over the central inbox)', () => {
	it('saveIncoming stores the message in the common shape, raw event included', async () => {
		const { service, conversations, messages } = build();

		await expect(service.saveIncoming(OWNER, incoming())).resolves.toBe(true);

		expect(conversations.ensure).toHaveBeenCalledWith(OWNER, KEY, {
			accountKey: 'ACCOUNT1',
		});
		expect(messages.saveIncoming).toHaveBeenCalledWith(
			OWNER,
			CONV,
			expect.objectContaining({
				channelMessageId: 'm1',
				kind: 'IMAGE',
				text: 'oi',
				sender: { id: 'IGSID1', name: null, username: null },
				attachments: [
					expect.objectContaining({
						kind: 'IMAGE',
						source: { type: 'URL', url: 'https://cdn.fbsbx.com/a.jpg' },
					}),
				],
				channelData: { attachmentTypes: ['image'] },
				raw: { message: { mid: 'm1' } },
			}),
		);
	});

	it('saveIncoming says false for a message it already had', async () => {
		const { service, messages } = build();
		messages.saveIncoming.mockResolvedValue(false);

		await expect(service.saveIncoming(OWNER, incoming())).resolves.toBe(false);
	});

	it('saveEcho stores what the Page sent from outside, with no sender', async () => {
		const { service, messages } = build();

		await expect(
			service.saveEcho(OWNER, incoming({ direction: 'OUT' })),
		).resolves.toBe(true);

		expect(messages.saveEcho.mock.calls[0][2].sender).toBeNull();
	});

	it('saveOutgoing stores a reply sent from here and gives it back in the Instagram shape', async () => {
		const { service, messages } = build();

		const record = await service.saveOutgoing(OWNER, {
			igsid: 'IGSID1',
			mid: 'm9',
			text: 'claro',
			sentAt: new Date('2030-01-02'),
			sentByEmployeeId: 'e1',
		});

		expect(messages.saveOutgoing).toHaveBeenCalledWith(
			OWNER,
			CONV,
			expect.objectContaining({
				channelMessageId: 'm9',
				text: 'claro',
				sentByEmployeeId: 'e1',
			}),
		);
		expect(record).toMatchObject({
			mid: 'm9',
			igsid: 'IGSID1',
			text: 'claro',
			sentByEmployeeId: 'e1',
		});
	});

	it('keeps a message Instagram could not carry as unsupported', async () => {
		const { service, messages } = build();

		await service.saveIncoming(
			OWNER,
			incoming({ text: null, attachments: [], isUnsupported: true }),
		);

		expect(messages.saveIncoming.mock.calls[0][2]).toMatchObject({
			kind: 'UNSUPPORTED',
			isUnsupported: true,
		});
	});

	it('listByChat and findOwned answer in the Instagram shape, with the file kinds Instagram used', async () => {
		const { service, messages } = build();
		messages.listByConversation.mockResolvedValue([
			stored({
				kind: 'IMAGE',
				attachments: [
					{ kind: 'IMAGE', source: { type: 'URL', url: 'https://x/a.jpg' } },
					{ kind: 'AUDIO', source: { type: 'URL', url: 'https://x/b.mp4' } },
				],
				channelData: { attachmentTypes: ['image', 'audio'] },
			}),
		]);

		const [record] = await service.listByChat(OWNER, 'IGSID1', { limit: 5 });

		expect(messages.listByConversation).toHaveBeenCalledWith(OWNER, 'c1', {
			limit: 5,
		});
		expect(record.attachments).toEqual([
			{ type: 'image', url: 'https://x/a.jpg' },
			{ type: 'audio', url: 'https://x/b.mp4' },
		]);
		await expect(
			service.findOwned(OWNER, 'IGSID1', 'x1'),
		).resolves.toMatchObject({
			mid: 'm9',
		});
	});

	it('answers empty for a person who has no conversation', async () => {
		const { service, messages } = build(null);

		await expect(service.listByChat(OWNER, 'X')).resolves.toEqual([]);
		await expect(service.findOwned(OWNER, 'X', 'x1')).resolves.toBeNull();
		expect(messages.listByConversation).not.toHaveBeenCalled();
	});
});
