import * as bcrypt from 'bcrypt';

import { Injectable } from '@nestjs/common';

@Injectable()
export default class HashCrypt {
	private readonly _saltOrRounds: number = +process.env.BCRYPT_SALT_ROUNDS;

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
}
