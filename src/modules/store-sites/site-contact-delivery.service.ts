import { lookup } from 'dns/promises';
import { isIP } from 'net';

import { Injectable, Logger } from '@nestjs/common';

import EmailTransportService from '../../infra/services/email-transport/email-transport.service';
import { contactLinesOf, IContactAnswer } from './store-site-contact';

const WEBHOOK_TIMEOUT_MS = 5000;

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/** One line, whatever was written: nothing in it can start a header. */
const oneLine = (value: string): string =>
	value.replace(/[\r\n]+/g, ' ').trim();

const isPublicV4 = (address: string): boolean => {
	const [a, b] = address.split('.').map(Number);

	return !(
		a === 0 ||
		a === 10 ||
		a === 127 ||
		(a === 100 && b >= 64 && b <= 127) ||
		(a === 169 && b === 254) ||
		(a === 172 && b >= 16 && b <= 31) ||
		(a === 192 && b === 168) ||
		(a === 192 && b === 0) ||
		(a === 198 && (b === 18 || b === 19)) ||
		a >= 224
	);
};

/**
 * Whether an address is out on the internet: not this machine, not a
 * network of its own, not one that only reaches its neighbours.
 */
export const isPublicAddress = (address: string): boolean => {
	const kind: number = isIP(address);

	if (kind === 4) {
		return isPublicV4(address);
	}

	if (kind !== 6) {
		return false;
	}

	const lower: string = address.toLowerCase();

	// An older address written the new way is judged as the older one.
	const mapped: RegExpMatchArray | null = lower.match(
		/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/,
	);

	if (mapped) {
		return isPublicV4(mapped[1]);
	}

	return !(
		lower === '::' ||
		lower === '::1' ||
		lower.startsWith('::ffff:') ||
		/^f[cd]/.test(lower) ||
		/^fe[89ab]/.test(lower) ||
		lower.startsWith('ff')
	);
};

/** What a webhook receives of a form that was sent. */
export interface IContactWebhookPayload {
	site: string;
	store: string;
	sentAt: string;
	fields: IContactAnswer[];
}

/**
 * Takes what a contact form gathered out of here: to an e-mail, or to an
 * address of the owner's as data. Neither tells the visitor why it failed.
 */
@Injectable()
export class SiteContactDeliveryService {
	private readonly _logger: Logger = new Logger(
		SiteContactDeliveryService.name,
	);

	constructor(private readonly _emails: EmailTransportService) {}

	/** An e-mail with every answer; answering it writes to who filled the form. */
	public async email(
		to: string,
		storeName: string,
		answers: IContactAnswer[],
		replyTo: string | null,
	): Promise<boolean> {
		const lines: string[] = contactLinesOf(answers);

		const html: string = answers
			.map(
				(answer: IContactAnswer) =>
					`<p><strong>${escapeHtml(answer.label)}:</strong><br>${escapeHtml(
						answer.value,
					).replace(/\n/g, '<br>')}</p>`,
			)
			.join('');

		const messageId: string | null = await this._emails.sendEmail({
			to,
			subject: oneLine(`New message from the site of ${storeName}`),
			text: lines.join('\n'),
			html,
			...(replyTo ? { replyTo: oneLine(replyTo) } : {}),
		});

		return !!messageId;
	}

	/**
	 * The answers as data to the owner's address. It must lead out on the
	 * internet, which is checked now, by where its name really points; it is
	 * not followed anywhere else, and it has a few seconds to answer.
	 */
	public async webhook(
		url: string,
		payload: IContactWebhookPayload,
	): Promise<boolean> {
		try {
			const { hostname } = new URL(url);

			const addresses = await lookup(hostname, { all: true });

			if (
				!addresses.length ||
				!addresses.every(({ address }) => isPublicAddress(address))
			) {
				this._logger.warn(`Contact webhook refused: ${hostname}`);

				return false;
			}

			const response: Response = await fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
				redirect: 'error',
				signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
			});

			return response.ok;
		} catch (error: any) {
			this._logger.warn(`Contact webhook failed: ${error?.message}`);

			return false;
		}
	}
}
