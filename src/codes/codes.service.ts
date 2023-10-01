import * as moment from 'moment';
import { Model } from 'mongoose';

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { makeRandomCode } from '../shared/helpers/global';
import { schemasName } from '../shared/modules/imports/schemas/schemas';
import { ICode } from './interfaces/code.interface';
import CodesEnum from './interfaces/codes.enum';

@Injectable()
export class CodesService {
	// #region Private Properties

	private readonly _logger: Logger;

	private readonly _codeExpiresInDays: number =
		+process.env.CODE_EXPIRES_IN_DAYS;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.code) private readonly _codeModel: Model<ICode>,
	) {
		this._logger = new Logger(CodesService.name);
	}

	// #endregion

	// #region Public Methods

	public async createSignIn(userId: string): Promise<ICode> {
		const type: CodesEnum.Type = CodesEnum.Type.SIGN_IN;
		return await this._getByUserIdAndType(userId, type);
	}

	public async validateSignIn(userId: string, value: string): Promise<boolean> {
		const type: CodesEnum.Type = CodesEnum.Type.SIGN_IN;
		return await this._validateCode(userId, type, value);
	}

	public async createRecoverPassword(userId: string): Promise<ICode> {
		const type: CodesEnum.Type = CodesEnum.Type.RECOVER_PASSWORD;
		return await this._getByUserIdAndType(userId, type);
	}

	public async validateRecoverPassword(
		userId: string,
		value: string,
	): Promise<boolean> {
		const type: CodesEnum.Type = CodesEnum.Type.RECOVER_PASSWORD;
		return await this._validateCode(userId, type, value);
	}

	// #endregion

	//#region Private Methods

	private async _getByUserIdAndType(
		userId: string,
		type: CodesEnum.Type,
	): Promise<ICode> {
		const findCodeByUserAndType = await this._codeModel.findOne({
			userId,
			type,
		});

		const value: string = makeRandomCode();
		const expiresIn: Date = moment()
			.add(this._codeExpiresInDays, 'days')
			.toDate();

		if (findCodeByUserAndType) {
			if (moment().isBefore(findCodeByUserAndType.expiresIn)) {
				return findCodeByUserAndType;
			}

			return this._codeModel.findOneAndUpdate(
				findCodeByUserAndType._id,
				{
					$set: {
						value: value,
						expiresIn,
					},
				},
				{ new: true },
			);
		}

		const newCode = new this._codeModel({
			userId,
			value,
			type,
			expiresIn,
		});

		return newCode.save();
	}

	private async _validateCode(
		userId: string,
		type: CodesEnum.Type,
		value: string,
	): Promise<boolean> {
		const findCodeByUserAndType: ICode | undefined =
			await this._codeModel.findOne({
				userId,
				type,
			});

		if (!findCodeByUserAndType) {
			this._logger.warn('Code not found!', { userId, type });

			throw new NotFoundException('Code not found!');
		}

		if (moment().isAfter(findCodeByUserAndType.expiresIn)) {
			throw new BadRequestException('Code expired!');
		}

		if (findCodeByUserAndType.value === value) {
			await this._updateCode(userId, type);
			return true;
		}

		return false;
	}

	private async _updateCode(
		userId: string,
		type: CodesEnum.Type,
	): Promise<ICode> {
		const findCodeByUserAndType: ICode = await this._codeModel.findOne({
			userId,
			type,
		});

		const value: string = makeRandomCode();
		const expiresIn: Date = moment()
			.add(this._codeExpiresInDays, 'days')
			.toDate();

		return this._codeModel.findOneAndUpdate(
			findCodeByUserAndType._id,
			{
				$set: {
					value: value,
					expiresIn,
				},
			},
			{ new: true },
		);
	}

	//#endregion
}
