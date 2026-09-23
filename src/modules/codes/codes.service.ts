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
import { ICodeOwner } from './interfaces/codes.types';

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

	// #region Public Methods - User

	public async createSignIn(userId: string): Promise<ICode> {
		return await this._getByOwnerAndType(
			this._owner({ userId }),
			CodesEnum.Type.SIGN_IN,
		);
	}

	public async validateSignIn(userId: string, value: string): Promise<boolean> {
		return await this._validateCode(
			this._owner({ userId }),
			CodesEnum.Type.SIGN_IN,
			value,
		);
	}

	public async createRecoverPassword(userId: string): Promise<ICode> {
		return await this._getByOwnerAndType(
			this._owner({ userId }),
			CodesEnum.Type.RECOVER_PASSWORD,
		);
	}

	public async validateRecoverPassword(
		userId: string,
		value: string,
	): Promise<boolean> {
		return await this._validateCode(
			this._owner({ userId }),
			CodesEnum.Type.RECOVER_PASSWORD,
			value,
		);
	}

	public async createUpdateEmail(userId: string): Promise<ICode> {
		return await this._getByOwnerAndType(
			this._owner({ userId }),
			CodesEnum.Type.UPDATE_EMAIL,
		);
	}

	public async validateUpdateEmail(
		userId: string,
		value: string,
	): Promise<boolean> {
		return await this._validateCode(
			this._owner({ userId }),
			CodesEnum.Type.UPDATE_EMAIL,
			value,
		);
	}

	// #endregion

	// #region Public Methods - Employee

	public async createSignInEmployee(
		userId: string,
		employeeId: string,
	): Promise<ICode> {
		return await this._getByOwnerAndType(
			this._owner({ userId, employeeId }),
			CodesEnum.Type.SIGN_IN_EMPLOYEE,
		);
	}

	public async validateSignInEmployee(
		userId: string,
		value: string,
		employeeId: string,
	): Promise<boolean> {
		return await this._validateCode(
			this._owner({ userId, employeeId }),
			CodesEnum.Type.SIGN_IN_EMPLOYEE,
			value,
		);
	}

	public async validateCreateSignInEmployee(
		userId: string,
		employeeId: string,
		value: string,
	): Promise<boolean> {
		return await this._validateCode(
			this._owner({ userId, employeeId }),
			CodesEnum.Type.SIGN_IN_EMPLOYEE,
			value,
		);
	}

	// #endregion

	// #region Public Methods - Manager

	public async createManagerSignIn(managerId: string): Promise<ICode> {
		return await this._getByOwnerAndType(
			this._owner({ managerId }),
			CodesEnum.Type.MANAGER_SIGN_IN,
		);
	}

	public async validateManagerSignIn(
		managerId: string,
		value: string,
	): Promise<boolean> {
		return await this._validateCode(
			this._owner({ managerId }),
			CodesEnum.Type.MANAGER_SIGN_IN,
			value,
		);
	}

	public async createManagerRecoverPassword(managerId: string): Promise<ICode> {
		return await this._getByOwnerAndType(
			this._owner({ managerId }),
			CodesEnum.Type.MANAGER_RECOVER_PASSWORD,
		);
	}

	public async validateManagerRecoverPassword(
		managerId: string,
		value: string,
	): Promise<boolean> {
		return await this._validateCode(
			this._owner({ managerId }),
			CodesEnum.Type.MANAGER_RECOVER_PASSWORD,
			value,
		);
	}

	// #endregion

	// #region Public Methods - Lookup

	public async findOneByOwnerAndType(
		owner: ICodeOwner,
		type: CodesEnum.Type,
	): Promise<ICode> {
		const code: ICode | undefined = await this._codeModel.findOne({
			...owner,
			type,
		});

		if (!code) {
			this._logger.warn('Code not found!', { ...owner, type });

			throw new NotFoundException('Code not found!');
		}

		return code;
	}

	public async findOneByUserIdAndCode(
		userId: string,
		type: CodesEnum.Type,
		employeeId: string | null = null,
	): Promise<ICode> {
		return await this.findOneByOwnerAndType(
			this._owner({ userId, employeeId }),
			type,
		);
	}

	// #endregion

	//#region Private Methods

	private _owner(params: Partial<ICodeOwner>): ICodeOwner {
		return {
			userId: params.userId ?? null,
			employeeId: params.employeeId ?? null,
			managerId: params.managerId ?? null,
		};
	}

	private async _getByOwnerAndType(
		owner: ICodeOwner,
		type: CodesEnum.Type,
	): Promise<ICode> {
		const findCode: ICode = await this._codeModel.findOne({
			...owner,
			type,
		});

		const value: string = makeRandomCode();
		const expiresIn: Date = moment()
			.add(this._codeExpiresInDays, 'days')
			.toDate();

		if (findCode) {
			if (moment().isBefore(findCode.expiresIn)) {
				return findCode;
			}

			return this._codeModel.findOneAndUpdate(
				new Types.ObjectId(findCode._id),
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
			...owner,
			value,
			type,
			expiresIn,
			createdAt: now,
			updatedAt: now,
		});

		return newCode.save();
	}

	private async _validateCode(
		owner: ICodeOwner,
		type: CodesEnum.Type,
		value: string,
	): Promise<boolean> {
		const code: ICode = await this.findOneByOwnerAndType(owner, type);

		if (moment().isAfter(code.expiresIn)) {
			throw new BadRequestException('Code expired!');
		}

		if (code.value === value) {
			await this._updateCode(owner, type);
			return true;
		}

		return false;
	}

	private async _updateCode(
		owner: ICodeOwner,
		type: CodesEnum.Type,
	): Promise<ICode> {
		const code: ICode = await this.findOneByOwnerAndType(owner, type);

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
