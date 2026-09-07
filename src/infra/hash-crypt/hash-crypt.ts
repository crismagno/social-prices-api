import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';

export interface IDecryptAndValidateExpiration {
	exp: number;
}

@Injectable()
export default class HashCrypt {
	//#region Private Properties

	private readonly _saltOrRounds: number = +process.env.BCRYPT_SALT_ROUNDS;
	private readonly _encryptSecretKey: string = process.env.ENCRYPT_SECRET_KEY;
	private readonly ALGORITHM = 'aes-256-gcm';

	//#endregion

	//#region Public Methods

	public async generateHash(
		value: string,
		useGenSalt?: boolean,
	): Promise<string> {
		const salt: number | string = useGenSalt
			? await this.generateSalt()
			: this._saltOrRounds;

		return await bcrypt.hash(value, salt);
	}

	public async isMatchCompare(value: string, hash: string): Promise<boolean> {
		return await bcrypt.compare(value, hash);
	}

	public async generateSalt(): Promise<string> {
		return await bcrypt.genSalt();
	}

	public encrypt(data: any): string {
		const iv: Buffer = crypto.randomBytes(16);

		const cipher: crypto.CipherGCM = crypto.createCipheriv(
			this.ALGORITHM,
			Buffer.from(this._encryptSecretKey),
			iv,
		);

		let encrypted: string = cipher.update(JSON.stringify(data), 'utf8', 'hex');
		encrypted += cipher.final('hex');

		const authTag: string = cipher.getAuthTag().toString('hex');

		return iv.toString('hex') + '.' + authTag + '.' + encrypted;
	}

	public decrypt<T>(token: string): T {
		const [ivHex, authTagHex, encrypted] = token.split('.');

		const iv: Buffer = Buffer.from(ivHex, 'hex');

		const authTag: Buffer = Buffer.from(authTagHex, 'hex');

		const decipher: crypto.DecipherGCM = crypto.createDecipheriv(
			this.ALGORITHM,
			Buffer.from(this._encryptSecretKey),
			iv,
		);
		decipher.setAuthTag(authTag);

		let decrypted: string = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		return JSON.parse(decrypted);
	}

	public encryptWithExpirationDays(data: any, totalDays: number = 1): string {
		const total1Day: number = 60 * 60 * 1000 * 24;
		return this.encrypt({ ...data, exp: Date.now() + total1Day * totalDays });
	}

	public decryptAndValidateExpiration<T extends IDecryptAndValidateExpiration>(
		token: string,
	): T {
		const data: T = this.decrypt<T>(token);

		if (!data || !data?.exp) {
			throw new Error('Token invalid');
		}

		if (Date.now() > data?.exp) throw new Error('Token expired');

		return data;
	}

	//#endregion
}
