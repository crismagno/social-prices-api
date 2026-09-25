import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { FeatureLimitReachedException } from './feature-limit-reached.exception';
import FeatureLimitsEnum from './interfaces/feature-limits.enum';
import { IFeaturesUsage } from './interfaces/feature-limits.types';

@Injectable()
export class FeatureLimitsService {
	//#region Private Properties

	private readonly _modelsByFeature: Record<
		FeatureLimitsEnum.Feature,
		Model<any>
	>;

	//#endregion

	//#region Constructor

	constructor(
		@InjectModel(schemasName.product) productModel: Model<any>,
		@InjectModel(schemasName.productItem) productItemModel: Model<any>,
		@InjectModel(schemasName.customer) customerModel: Model<any>,
		@InjectModel(schemasName.employee) employeeModel: Model<any>,
		@InjectModel(schemasName.store) storeModel: Model<any>,
		@InjectModel(schemasName.category) categoryModel: Model<any>,
		@InjectModel(schemasName.tag) tagModel: Model<any>,
		private readonly _usersService: UsersService,
	) {
		this._modelsByFeature = {
			[FeatureLimitsEnum.Feature.PRODUCTS]: productModel,
			[FeatureLimitsEnum.Feature.PRODUCT_ITEMS]: productItemModel,
			[FeatureLimitsEnum.Feature.CUSTOMERS]: customerModel,
			[FeatureLimitsEnum.Feature.EMPLOYEES]: employeeModel,
			[FeatureLimitsEnum.Feature.STORES]: storeModel,
			[FeatureLimitsEnum.Feature.CATEGORIES]: categoryModel,
			[FeatureLimitsEnum.Feature.TAGS]: tagModel,
		};
	}

	//#endregion

	//#region Public Methods

	public async assertCanCreate(
		userId: string,
		feature: FeatureLimitsEnum.Feature,
		amount: number = 1,
	): Promise<void> {
		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

		const limit: number | null = this._resolveLimit(user, feature);

		if (limit === null) {
			return;
		}

		const current: number = await this._count(userId, feature);

		if (current + amount > limit) {
			throw new FeatureLimitReachedException(feature, limit, current);
		}
	}

	public async getUsage(userId: string): Promise<IFeaturesUsage> {
		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

		const features: FeatureLimitsEnum.Feature[] = Object.values(
			FeatureLimitsEnum.Feature,
		);

		const usedByFeature: number[] = await Promise.all(
			features.map((feature: FeatureLimitsEnum.Feature) =>
				this._count(userId, feature),
			),
		);

		return features.reduce((usage: IFeaturesUsage, feature, index) => {
			usage[feature] = {
				limit: this._resolveLimit(user, feature),
				used: usedByFeature[index],
			};

			return usage;
		}, {} as IFeaturesUsage);
	}

	//#endregion

	//#region Private Methods

	private _resolveLimit(
		user: IUser,
		feature: FeatureLimitsEnum.Feature,
	): number | null {
		const limit: unknown = user.limits?.features?.[feature];

		return typeof limit === 'number' ? limit : null;
	}

	private async _count(
		userId: string,
		feature: FeatureLimitsEnum.Feature,
	): Promise<number> {
		const ownerField: string =
			feature === FeatureLimitsEnum.Feature.CATEGORIES
				? 'ownerUserId'
				: 'userId';

		const filter: FilterQuery<any> = {
			[ownerField]: userId,
			'softDelete.isDeleted': { $ne: true },
		};

		return await this._modelsByFeature[feature].countDocuments(filter);
	}

	//#endregion
}
