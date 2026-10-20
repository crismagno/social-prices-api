import AppsEnum from '../interfaces/apps.enum';
import { MessengerStatusProvider } from './messenger.status.provider';

const connected = {
	connected: true,
	status: AppsEnum.ConnectionStatus.CONNECTED,
	accountLabel: 'Loja',
};

describe('MessengerStatusProvider', () => {
	it('adds how many messages are unread when a Page is connected', async () => {
		const chats: any = { countUnread: jest.fn().mockResolvedValue(4) };
		const provider = new MessengerStatusProvider(
			{ getStatus: jest.fn().mockResolvedValue(connected) } as any,
			chats,
		);

		await expect(provider.getStatus('u1')).resolves.toEqual({
			...connected,
			unreadCount: 4,
		});
		expect(chats.countUnread).toHaveBeenCalledWith('u1');
	});

	it('asks nothing about conversations when no Page is connected', async () => {
		const chats: any = { countUnread: jest.fn() };
		const none = { connected: false, status: null, accountLabel: null };
		const provider = new MessengerStatusProvider(
			{ getStatus: jest.fn().mockResolvedValue(none) } as any,
			chats,
		);

		await expect(provider.getStatus('u1')).resolves.toEqual(none);
		expect(chats.countUnread).not.toHaveBeenCalled();
	});
});
