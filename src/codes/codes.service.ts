import * as moment from 'moment';
import { Model } from 'mongoose';

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { makeRandomCode } from '../shared/helpers/global';
import { schemasName } from '../shared/modules/imports/schemas/schemas';
import { ICode } from './interfaces/code.interface';
import CodesEnum from './interfaces/codes.enum';

@Injectable()
export class CodesService {
	// #region Constructor

	constructor(
		@InjectModel(schemasName.code) private readonly _codeModel: Model<ICode>,
	) {}

	// #endregion

	// #region Public Methods

	public async createSignIn(userId: string): Promise<ICode> {
		const type: CodesEnum.Type = CodesEnum.Type.SIGN_IN;

		const findCodeByUserAndType = await this._codeModel.findOne({
			userId,
			type,
		});

		const value: string = makeRandomCode();
		const expiresIn: Date = moment().add(1, 'days').toDate();

		if (findCodeByUserAndType) {
			if (moment().isBefore(findCodeByUserAndType.expiresIn)) {
				return findCodeByUserAndType;
			}

			return await this._codeModel.findOneAndUpdate(
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

	public async updateSignIn(userId: string): Promise<ICode> {
		const type: CodesEnum.Type = CodesEnum.Type.SIGN_IN;

		const findCodeByUserAndType = await this._codeModel.findOne({
			userId,
			type,
		});

		const value: string = makeRandomCode();
		const expiresIn: Date = moment().add(1, 'days').toDate();

		return await this._codeModel.findOneAndUpdate(
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

	public async validateSignIn(userId: string, value: string): Promise<boolean> {
		const type: CodesEnum.Type = CodesEnum.Type.SIGN_IN;

		const findCodeByUserAndType: ICode | undefined =
			await this._codeModel.findOne({
				userId,
				type,
			});

		if (!findCodeByUserAndType) {
			throw new BadRequestException('Code not found!');
		}

		if (moment().isAfter(findCodeByUserAndType.expiresIn)) {
			throw new BadRequestException('Code expired!');
		}

		if (findCodeByUserAndType.value === value) {
			await this.updateSignIn(userId);
			return true;
		}

		return false;
	}

	// #endregion
}
