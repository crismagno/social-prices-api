import { Model } from 'mongoose';

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { AesGcmCipher } from '../../../infra/aes-gcm-cipher/aes-gcm-cipher';
import { schemasName } from '../../../infra/database/mongo/schemas';
import { IAppConnectionStatus } from '../core/status/app-status.types';
import AppsEnum from '../interfaces/apps.enum';
import { ITelegramConnection } from './telegram-connection.interface';
import { TelegramConnection } from './telegram-connection.schema';
import { ITelegramBotInfo } from './telegram.types';

export interface ISaveTelegramConnectionInput {
	ownerUserId: string;
	bot: ITelegramBotInfo;
	botToken: string;
	webhookKey: string;
	webhookSecretHash: string;
}

/**
 * Where Telegram keeps each user's bot. The token only exists encrypted in the
 * database, and the webhook secret only as a hash; neither comes back from a
 * normal query.
 */
@Injectable()
export class TelegramConnectionsService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.telegramConnection)
		private readonly _connectionModel: Model<TelegramConnection>,
		private readonly _cipher: AesGcmCipher,
	) {}

	//#endregion

	//#region Public Methods

	public async findByOwner(
		ownerUserId: string,
	): Promise<ITelegramConnection | null> {
		return await this._connectionModel.findOne({ ownerUserId });
	}

	public async findByBotId(botId: number): Promise<ITelegramConnection | null> {
		return await this._connectionModel.findOne({ botId });
	}

	public async findWithToken(
		ownerUserId: string,
	): Promise<ITelegramConnection | null> {
		return await this._connectionModel
			.findOne({ ownerUserId })
			.select('+token');
	}

	public async findByWebhookKey(
		webhookKey: string,
	): Promise<ITelegramConnection | null> {
		return await this._connectionModel
			.findOne({ webhookKey })
			.select('+webhookSecretHash');
	}

	public readToken(connection: ITelegramConnection): string {
		return this._cipher.decrypt<{ botToken: string }>(connection.token)
			.botToken;
	}

	/** Connecting again replaces the user's previous bot. */
	public async saveConnection(
		input: ISaveTelegramConnectionInput,
	): Promise<ITelegramConnection> {
		return await this._connectionModel.findOneAndUpdate(
			{ ownerUserId: input.ownerUserId },
			{
				$set: {
					status: AppsEnum.ConnectionStatus.CONNECTED,
					botId: input.bot.id,
					botUsername: input.bot.username,
					botName: input.bot.firstName,
					token: this._cipher.encrypt({ botToken: input.botToken }),
					webhookKey: input.webhookKey,
					webhookSecretHash: input.webhookSecretHash,
					webhookRegisteredAt: new Date(),
					connectedAt: new Date(),
					lastUpdateAt: null,
				},
			},
			{ upsert: true, new: true, setDefaultsOnInsert: true },
		);
	}

	/** A new public address needs a new webhook: same bot, new key and secret. */
	public async updateWebhook(
		connectionId: string,
		webhook: { webhookKey: string; webhookSecretHash: string },
	): Promise<void> {
		await this._connectionModel.updateOne(
			{ _id: connectionId },
			{
				$set: {
					webhookKey: webhook.webhookKey,
					webhookSecretHash: webhook.webhookSecretHash,
					webhookRegisteredAt: new Date(),
				},
			},
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
		const connection: ITelegramConnection | null =
			await this.findByOwner(ownerUserId);

		return {
			connected: connection?.status === AppsEnum.ConnectionStatus.CONNECTED,
			status: connection?.status ?? null,
			accountLabel: connection ? `@${connection.botUsername}` : null,
		};
	}

	//#endregion
}
