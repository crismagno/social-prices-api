import { createHmac } from 'crypto';

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

import { AppEmployeeLevelGuard } from '../core/guards/app-employee-level.guard';
import { AppEnabledGuard } from '../core/guards/app-enabled.guard';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';

const VERIFY_TOKEN = 'verify-token-for-tests';
const APP_SECRET = 'app-secret-for-tests';

describe('InstagramController webhook', () => {
	let app: INestApplication;
	let baseUrl: string;
	const saved = { ...process.env };

	beforeAll(async () => {
		process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN;
		process.env.INSTAGRAM_APP_SECRET = APP_SECRET;

		const moduleRef = await Test.createTestingModule({
			controllers: [InstagramController],
			providers: [
				{ provide: InstagramService, useValue: { handleWebhook: jest.fn() } },
			],
		})
			// The webhook is public; the guards belong to the routes of the logged user.
			.overrideGuard(AppEnabledGuard)
			.useValue({ canActivate: () => true })
			.overrideGuard(AppEmployeeLevelGuard)
			.useValue({ canActivate: () => true })
			.compile();

		// The same switch main.ts turns on, so the signature sees the raw bytes.
		app = moduleRef.createNestApplication({ rawBody: true });
		await app.listen(0);
		baseUrl = await app.getUrl();
	});

	afterAll(async () => {
		process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN =
			saved.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
		process.env.INSTAGRAM_APP_SECRET = saved.INSTAGRAM_APP_SECRET;
		await app.close();
	});

	it("does not take the Messenger app's verify token: Instagram has its own", async () => {
		const before = process.env.META_WEBHOOK_VERIFY_TOKEN;
		process.env.META_WEBHOOK_VERIFY_TOKEN = 'the-messenger-token';

		try {
			const response = await fetch(
				`${baseUrl}/api/v1/apps/instagram/webhook?${new URLSearchParams({
					'hub.mode': 'subscribe',
					'hub.verify_token': 'the-messenger-token',
					'hub.challenge': '1',
				})}`,
			);

			expect(response.status).toBe(403);
		} finally {
			if (before === undefined) delete process.env.META_WEBHOOK_VERIFY_TOKEN;
			else process.env.META_WEBHOOK_VERIFY_TOKEN = before;
		}
	});

	const verify = (query: Record<string, string>) =>
		fetch(
			`${baseUrl}/api/v1/apps/instagram/webhook?${new URLSearchParams(query)}`,
		);

	it('answers Meta its own challenge when the verify token is the right one', async () => {
		const response = await verify({
			'hub.mode': 'subscribe',
			'hub.verify_token': VERIFY_TOKEN,
			'hub.challenge': '1158201444',
		});

		expect(response.status).toBe(200);
		expect(await response.text()).toBe('1158201444');
	});

	it.each([
		{
			'hub.mode': 'subscribe',
			'hub.verify_token': 'wrong',
			'hub.challenge': '1',
		},
		{
			'hub.mode': 'unsubscribe',
			'hub.verify_token': VERIFY_TOKEN,
			'hub.challenge': '1',
		},
		{ 'hub.mode': 'subscribe', 'hub.challenge': '1' },
	])(
		'refuses a verification that does not carry the token (%p)',
		async (query) => {
			expect((await verify(query)).status).toBe(403);
		},
	);

	const post = (body: string, signature?: string) =>
		fetch(`${baseUrl}/api/v1/apps/instagram/webhook`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(signature ? { 'X-Hub-Signature-256': signature } : {}),
			},
			body,
		});

	const sign = (body: string, secret = APP_SECRET) =>
		`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

	it('accepts an event signed with the app secret', async () => {
		const body = JSON.stringify({ object: 'instagram', entry: [] });

		expect((await post(body, sign(body))).status).toBe(200);
	});

	it('refuses an event with no signature, a wrong one, or a body changed after signing', async () => {
		const body = JSON.stringify({ object: 'instagram', entry: [] });

		expect((await post(body)).status).toBe(403);
		expect((await post(body, sign(body, 'other'))).status).toBe(403);
		expect((await post(body + ' ', sign(body))).status).toBe(403);
	});
});
