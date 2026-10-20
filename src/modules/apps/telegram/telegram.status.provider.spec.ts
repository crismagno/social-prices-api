import AppsEnum from '../interfaces/apps.enum';
import { TelegramStatusProvider } from './telegram.status.provider';

const connected = {
	connected: true,
	status: AppsEnum.ConnectionStatus.CONNECTED,
	accountLabel: '@loja_bot',
};

describe('TelegramStatusProvider', () => {
	it('adds how many messages are unread when a bot is connected', async () => {
		const chats: any = { countUnread: jest.fn().mockResolvedValue(4) };
		const provider = new TelegramStatusProvider(
			{ getStatus: jest.fn().mockResolvedValue(connected) } as any,
			chats,
		);

		await expect(provider.getStatus('u1')).resolves.toEqual({
			...connected,
			unreadCount: 4,
		});
		expect(chats.countUnread).toHaveBeenCalledWith('u1');
	});

	it('asks nothing about conversations when no bot is connected', async () => {
		const chats: any = { countUnread: jest.fn() };
		const none = { connected: false, status: null, accountLabel: null };
		const provider = new TelegramStatusProvider(
			{ getStatus: jest.fn().mockResolvedValue(none) } as any,
			chats,
		);

		await expect(provider.getStatus('u1')).resolves.toEqual(none);
		expect(chats.countUnread).not.toHaveBeenCalled();
	});
});
