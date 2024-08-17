import * as moment from 'moment';
import { Model, Types } from 'mongoose';

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { makeRandomCode } from '../../shared/utils/global/global';
import { ICode } from './interfaces/code.interface';
import { Code } from './interfaces/code.schema';
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
		@InjectModel(schemasName.code) private readonly _codeModel: Model<Code>,
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

	public async createUpdateEmail(userId: string): Promise<ICode> {
		const type: CodesEnum.Type = CodesEnum.Type.UPDATE_EMAIL;
		return await this._getByUserIdAndType(userId, type);
	}

	public async validateUpdateEmail(
		userId: string,
		value: string,
	): Promise<boolean> {
		const type: CodesEnum.Type = CodesEnum.Type.UPDATE_EMAIL;
		return await this._validateCode(userId, type, value);
	}

	public async createSignInEmployee(
		userId: string,
		employeeId: string,
	): Promise<ICode> {
		const type: CodesEnum.Type = CodesEnum.Type.SIGN_IN_EMPLOYEE;
		return await this._getByUserIdAndType(userId, type, employeeId);
	}

	public async validateCreateSignInEmployee(
		userId: string,
		employeeId: string,
		value: string,
	): Promise<boolean> {
		const type: CodesEnum.Type = CodesEnum.Type.SIGN_IN_EMPLOYEE;
		return await this._validateCode(userId, type, value, employeeId);
	}

	public async findOneByUserIdAndCode(
		userId: string,
		type: CodesEnum.Type,
		employeeId: string | null = null,
	): Promise<ICode> {
		const code: ICode | undefined = await this._codeModel.findOne({
			userId,
			type,
			employeeId,
		});

		if (!code) {
			this._logger.warn('Code not found!', { userId, type, employeeId });

			throw new NotFoundException('Code not found!');
		}

		return code;
	}

	// #endregion

	//#region Private Methods

	private async _getByUserIdAndType(
		userId: string,
		type: CodesEnum.Type,
		employeeId: string | null = null,
	): Promise<ICode> {
		const findCodeByUserAndType: ICode = await this._codeModel.findOne({
			userId,
			type,
			employeeId,
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
				new Types.ObjectId(findCodeByUserAndType._id),
				{
					$set: {
						value: value,
						expiresIn,
					},
				},
				{ new: true },
			);
		}

		const now: Date = new Date();

		const newCode = new this._codeModel({
			userId,
			value,
			type,
			expiresIn,
			employeeId,
			createdAt: now,
			updatedAt: now,
		});

		return newCode.save();
	}

	private async _validateCode(
		userId: string,
		type: CodesEnum.Type,
		value: string,
		employeeId: string | null = null,
	): Promise<boolean> {
		const code: ICode = await this.findOneByUserIdAndCode(
			userId,
			type,
			employeeId,
		);

		if (moment().isAfter(code.expiresIn)) {
			throw new BadRequestException('Code expired!');
		}

		if (code.value === value) {
			await this._updateCode(userId, type);
			return true;
		}

		return false;
	}

	private async _updateCode(
		userId: string,
		type: CodesEnum.Type,
		employeeId: string | null = null,
	): Promise<ICode> {
		const code: ICode = await this.findOneByUserIdAndCode(
			userId,
			type,
			employeeId,
		);

		const value: string = makeRandomCode();
		const expiresIn: Date = moment()
			.add(this._codeExpiresInDays, 'days')
			.toDate();

		return this._codeModel.findOneAndUpdate(
			new Types.ObjectId(code._id),
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
