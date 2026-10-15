import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';

const ALGORITHM = 'aes-256-gcm' as const;
const IV_BYTES: number = 12;
const KEY_BYTES: number = 32;
const SEPARATOR: string = '.';

/**
 * The only code that touches APPS_ENCRYPTION_KEY. Stored format:
 * base64(iv).base64(authTag).base64(ciphertext). GCM's auth tag makes any
 * change to the stored string fail on decrypt instead of yielding garbage.
 */
@Injectable()
export class AppCredentialsVault {
	//#region Public Methods

	public encrypt(credentials: object): string {
		const iv: Buffer = randomBytes(IV_BYTES);
		const cipher = createCipheriv(ALGORITHM, this._key(), iv);

		const ciphertext: Buffer = Buffer.concat([
			cipher.update(JSON.stringify(credentials), 'utf8'),
			cipher.final(),
		]);

		return [iv, cipher.getAuthTag(), ciphertext]
			.map((part: Buffer) => part.toString('base64'))
			.join(SEPARATOR);
	}

	public decrypt<T extends object>(payload: string): T {
		const parts: string[] = (payload ?? '').split(SEPARATOR);

		if (parts.length !== 3) {
			throw new Error('Malformed encrypted credentials.');
		}

		const [iv, tag, ciphertext] = parts.map((part: string) =>
			Buffer.from(part, 'base64'),
		);

		const decipher = createDecipheriv(ALGORITHM, this._key(), iv);
		decipher.setAuthTag(tag);

		const plain: Buffer = Buffer.concat([
			decipher.update(ciphertext),
			decipher.final(),
		]);

		return JSON.parse(plain.toString('utf8')) as T;
	}

	//#endregion

	//#region Private Methods

	private _key(): Buffer {
		const key: Buffer = Buffer.from(
			process.env.APPS_ENCRYPTION_KEY ?? '',
			'base64',
		);

		if (key.length !== KEY_BYTES) {
			throw new Error('APPS_ENCRYPTION_KEY must be 32 bytes, base64 encoded.');
		}

		return key;
	}

	//#endregion
}
