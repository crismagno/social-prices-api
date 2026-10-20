import AppsEnum from '../../interfaces/apps.enum';
import { AppsRealtimeEvents } from './apps-realtime.events';
import { AppsRealtimeGateway } from './apps-realtime.gateway';

const build = (payload: any = { _id: 'u1' }, verifyFails = false) => {
	const authorizationToken: any = {
		getToken: jest.fn().mockImplementation(async () => {
			if (verifyFails) {
				throw new Error('bad token');
			}

			return payload;
		}),
	};
	const emit = jest.fn();
	const to = jest.fn().mockReturnValue({ emit });
	const gateway = new AppsRealtimeGateway(authorizationToken);
	gateway.server = { to } as any;
	const client: any = {
		id: 'sock1',
		join: jest.fn(),
		leave: jest.fn(),
		rooms: new Set<string>(['sock1']),
	};

	return { gateway, authorizationToken, client, to, emit };
};

describe('AppsRealtimeGateway', () => {
	describe('subscribe', () => {
		it('puts the connection in the room of the account the token belongs to', async () => {
			const { gateway, client, authorizationToken } = build({ _id: 'u1' });

			await expect(
				gateway.handleSubscribe(client, { token: 'T' }),
			).resolves.toEqual({
				ok: true,
			});

			expect(authorizationToken.getToken).toHaveBeenCalledWith('T');
			expect(client.join).toHaveBeenCalledWith('apps:owner:u1');
		});

		it('is the account of the employee too: the token carries the owner id', async () => {
			const { gateway, client } = build({ _id: 'owner1', employeeId: 'e1' });

			await gateway.handleSubscribe(client, { token: 'T' });

			expect(client.join).toHaveBeenCalledWith('apps:owner:owner1');
		});

		it.each([
			['a token that does not verify', undefined, true],
			['a manager token', { _id: 'm1', type: 'MANAGER' }, false],
			['a token with no account', {}, false],
		])('does not join anything with %s', async (_why, payload, fails) => {
			const { gateway, client } = build(payload as any, fails as boolean);

			await expect(
				gateway.handleSubscribe(client, { token: 'T' }),
			).resolves.toEqual({
				ok: false,
			});
			expect(client.join).not.toHaveBeenCalled();
		});

		it.each([undefined, null, {}, { token: 123 }, { token: '' }])(
			'does not join anything for a body without a token (%p)',
			async (body) => {
				const { gateway, client, authorizationToken } = build();

				await expect(
					gateway.handleSubscribe(client, body as any),
				).resolves.toEqual({
					ok: false,
				});
				expect(authorizationToken.getToken).not.toHaveBeenCalled();
				expect(client.join).not.toHaveBeenCalled();
			},
		);
	});

	describe('one account at a time', () => {
		it('leaves the room of the last account before joining the next', async () => {
			const { gateway, client } = build({ _id: 'u2' });
			client.rooms = new Set(['sock1', 'apps:owner:u1']);

			await gateway.handleSubscribe(client, { token: 'T' });

			expect(client.leave).toHaveBeenCalledWith('apps:owner:u1');
			expect(client.leave).not.toHaveBeenCalledWith('sock1');
			expect(client.join).toHaveBeenCalledWith('apps:owner:u2');
		});

		it('also leaves the last room when the new token does not verify', async () => {
			const { gateway, client } = build(undefined, true);
			client.rooms = new Set(['sock1', 'apps:owner:u1']);

			await expect(
				gateway.handleSubscribe(client, { token: 'bad' }),
			).resolves.toEqual({
				ok: false,
			});

			expect(client.leave).toHaveBeenCalledWith('apps:owner:u1');
			expect(client.join).not.toHaveBeenCalled();
		});

		it('unsubscribe leaves every apps room and nothing else', () => {
			const { gateway, client } = build();
			client.rooms = new Set(['sock1', 'apps:owner:u1', 'other-room']);

			expect(gateway.handleUnsubscribe(client)).toEqual({ ok: true });

			expect(client.leave).toHaveBeenCalledTimes(1);
			expect(client.leave).toHaveBeenCalledWith('apps:owner:u1');
		});
	});

	describe('notifyInboxUpdated', () => {
		it('tells only the room of that account, with no message content', () => {
			const { gateway, to, emit } = build();

			gateway.notifyInboxUpdated('u1', AppsEnum.App.TELEGRAM, '555');

			expect(to).toHaveBeenCalledWith('apps:owner:u1');
			expect(emit).toHaveBeenCalledWith(AppsRealtimeEvents.INBOX_UPDATED, {
				app: AppsEnum.App.TELEGRAM,
				chatKey: '555',
			});
		});

		it('never throws, whatever happens to the socket server', () => {
			const { gateway } = build();
			gateway.server = {
				to: () => {
					throw new Error('socket down');
				},
			} as any;

			expect(() =>
				gateway.notifyInboxUpdated('u1', AppsEnum.App.FACEBOOK, 'p1'),
			).not.toThrow();

			gateway.server = undefined;

			expect(() =>
				gateway.notifyInboxUpdated('u1', AppsEnum.App.FACEBOOK, 'p1'),
			).not.toThrow();
		});
	});
});
