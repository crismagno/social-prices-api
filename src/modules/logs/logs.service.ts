import { Model } from 'mongoose';

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { Log } from './interfaces/log.schema';
import LogsEnum from './interfaces/logs.enum';

@Injectable()
export class LogsService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	//#region Constructors

	constructor(
		@InjectModel(schemasName.log)
		private readonly _logModel: Model<Log>,
	) {
		this._logger = new Logger(LogsService.name);
	}

	//#endregion

	//#region Public Methods

	public async error(message: string, data: any = null): Promise<void> {
		await this._write(LogsEnum.Type.ERROR, message, data);
	}

	public async info(message: string, data: any = null): Promise<void> {
		await this._write(LogsEnum.Type.INFO, message, data);
	}

	public async warning(message: string, data: any = null): Promise<void> {
		await this._write(LogsEnum.Type.WARNING, message, data);
	}

	public async success(message: string, data: any = null): Promise<void> {
		await this._write(LogsEnum.Type.SUCCESS, message, data);
	}

	//#endregion

	//#region Private Methods

	/**
	 * Never throws. This service is called from inside the global exception
	 * filter, so a throw here would be an exception raised while handling an
	 * exception. On failure it falls back to the console logger.
	 */
	private async _write(
		type: LogsEnum.Type,
		message: string,
		data: any,
	): Promise<void> {
		try {
			const log = new this._logModel({
				message,
				data: data ?? null,
				type,
				createdAt: new Date(),
			});

			await log.save();
		} catch (error: any) {
			this._logger.error(
				`Could not persist log [${type}] "${message}": ${error?.message}`,
			);
		}
	}

	//#endregion
}
