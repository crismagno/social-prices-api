import { createHmac } from 'crypto';

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

import { AppEmployeeLevelGuard } from '../core/guards/app-employee-level.guard';
import { AppEnabledGuard } from '../core/guards/app-enabled.guard';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

const VERIFY_TOKEN = 'verify-token-for-tests';
const APP_SECRET = 'app-secret-for-tests';

describe('WhatsappController webhook', () => {
	let app: INestApplication;
	let baseUrl: string;
	const handleWebhook = jest.fn();
	const saved = { ...process.env };

	beforeAll(async () => {
		process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = VERIFY_TOKEN;
		process.env.WHATSAPP_APP_SECRET = APP_SECRET;

		const moduleRef = await Test.createTestingModule({
			controllers: [WhatsappController],
			providers: [{ provide: WhatsappService, useValue: { handleWebhook } }],
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
		process.env = { ...saved };
		await app.close();
	});

	const verify = (query: Record<string, string>) =>
		fetch(
			`${baseUrl}/api/v1/apps/whatsapp/webhook?${new URLSearchParams(query)}`,
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

	it("does not take another app's verify token", async () => {
		process.env.META_WEBHOOK_VERIFY_TOKEN = 'the-messenger-token';

		expect(
			(
				await verify({
					'hub.mode': 'subscribe',
					'hub.verify_token': 'the-messenger-token',
					'hub.challenge': '1',
				})
			).status,
		).toBe(403);
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
		fetch(`${baseUrl}/api/v1/apps/whatsapp/webhook`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(signature ? { 'X-Hub-Signature-256': signature } : {}),
			},
			body,
		});

	const sign = (body: string, secret = APP_SECRET) =>
		`sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

	it('hands an event signed with the app secret to the service', async () => {
		const body = JSON.stringify({
			object: 'whatsapp_business_account',
			entry: [],
		});

		expect((await post(body, sign(body))).status).toBe(200);
		expect(handleWebhook).toHaveBeenCalledWith({
			object: 'whatsapp_business_account',
			entry: [],
		});
	});

	it('refuses an event with no signature, a wrong one, or a body changed after signing, handing nothing over', async () => {
		handleWebhook.mockClear();
		const body = JSON.stringify({
			object: 'whatsapp_business_account',
			entry: [],
		});

		expect((await post(body)).status).toBe(403);
		expect((await post(body, sign(body, 'other'))).status).toBe(403);
		expect((await post(body + ' ', sign(body))).status).toBe(403);
		expect(handleWebhook).not.toHaveBeenCalled();
	});
});
