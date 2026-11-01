import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { AesGcmCipher } from '../../../infra/aes-gcm-cipher/aes-gcm-cipher';
import { schemasName } from '../../../infra/database/mongo/schemas';
import { IAppConnectionStatus } from '../core/status/app-status.types';
import AppsEnum from '../interfaces/apps.enum';
import { IWhatsappConnection } from './whatsapp-connection.interface';
import { WhatsappConnection } from './whatsapp-connection.schema';
import { IWhatsappNumber } from './whatsapp.types';

/**
 * Where the WhatsApp app keeps whose number is connected. The token and the PIN
 * only exist encrypted in the database and are never returned by a normal query.
 */
@Injectable()
export class WhatsappConnectionsService {
	constructor(
		@InjectModel(schemasName.whatsappConnection)
		private readonly _connectionModel: Model<WhatsappConnection>,
		private readonly _cipher: AesGcmCipher,
	) {}

	public async findByOwner(
		ownerUserId: string,
	): Promise<IWhatsappConnection | null> {
		return await this._connectionModel.findOne({ ownerUserId });
	}

	public async findWithToken(
		ownerUserId: string,
	): Promise<IWhatsappConnection | null> {
		return await this._connectionModel
			.findOne({ ownerUserId })
			.select('+token');
	}

	/** The connection of a number, as the webhook names it. */
	public async findByPhoneNumberId(
		phoneNumberId: string,
	): Promise<IWhatsappConnection | null> {
		return await this._connectionModel
			.findOne({ phoneNumberId })
			.select('+token');
	}

	public readToken(connection: IWhatsappConnection): string {
		return this._cipher.decrypt<{ accessToken: string }>(connection.token)
			.accessToken;
	}

	/** Connecting again replaces the user's previous number. */
	public async saveConnected(
		ownerUserId: string,
		data: {
			wabaId: string;
			phoneNumberId: string;
			number: IWhatsappNumber;
			accessToken: string;
			pin: string;
		},
	): Promise<IWhatsappConnection> {
		return await this._connectionModel.findOneAndUpdate(
			{ ownerUserId },
			{
				$set: {
					status: AppsEnum.ConnectionStatus.CONNECTED,
					wabaId: data.wabaId,
					phoneNumberId: data.phoneNumberId,
					displayPhoneNumber: data.number.displayPhoneNumber,
					verifiedName: data.number.verifiedName,
					token: this._cipher.encrypt({ accessToken: data.accessToken }),
					pin: this._cipher.encrypt({ pin: data.pin }),
					connectedAt: new Date(),
					lastUpdateAt: null,
				},
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);
	}

	/** The token no longer works (the user removed the app from their business): connect again. */
	public async markRevoked(connectionId: string): Promise<void> {
		await this._connectionModel.updateOne(
			{ _id: connectionId },
			{ $set: { status: AppsEnum.ConnectionStatus.REVOKED } },
		);
	}

	public async touchLastUpdate(connectionId: string, at: Date): Promise<void> {
		await this._connectionModel.updateOne(
			{ _id: connectionId },
			{ $set: { lastUpdateAt: at } },
		);
	}

	public async deleteByOwner(ownerUserId: string): Promise<void> {
		await this._connectionModel.deleteOne({ ownerUserId });
	}

	/** The short answer the apps catalog needs. */
	public async getStatus(ownerUserId: string): Promise<IAppConnectionStatus> {
		const connection: IWhatsappConnection | null =
			await this.findByOwner(ownerUserId);

		if (!connection) {
			return { connected: false, status: null, accountLabel: null };
		}

		const isRevoked: boolean =
			connection.status === AppsEnum.ConnectionStatus.REVOKED;

		return {
			connected: !isRevoked,
			status: isRevoked
				? AppsEnum.ConnectionStatus.REVOKED
				: AppsEnum.ConnectionStatus.CONNECTED,
			accountLabel: connection.displayPhoneNumber,
		};
	}
}
