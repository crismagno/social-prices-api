import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { FeatureDisabledException } from './feature-disabled.exception';
import { FeatureLimitReachedException } from './feature-limit-reached.exception';
import FeatureLimitsEnum from './interfaces/feature-limits.enum';
import {
	IFeatureUsage,
	IFeaturesUsage,
} from './interfaces/feature-limits.types';

const OWNER_USER_ID_FEATURES: FeatureLimitsEnum.Feature[] = [
	FeatureLimitsEnum.Feature.CUSTOMERS,
	FeatureLimitsEnum.Feature.CATEGORIES,
	FeatureLimitsEnum.Feature.QUICK_MESSAGES,
];

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
		@InjectModel(schemasName.quickMessage) quickMessageModel: Model<any>,
		@InjectModel(schemasName.storeSiteMock) storeSiteMockModel: Model<any>,
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
			[FeatureLimitsEnum.Feature.QUICK_MESSAGES]: quickMessageModel,
			[FeatureLimitsEnum.Feature.SITE_MOCKS]: storeSiteMockModel,
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

	public async isEnabled(
		userId: string,
		feature: FeatureLimitsEnum.Feature,
	): Promise<boolean> {
		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

		return this._resolveEnabled(user, feature);
	}

	public async assertEnabled(
		userId: string,
		feature: FeatureLimitsEnum.Feature,
	): Promise<void> {
		if (!(await this.isEnabled(userId, feature))) {
			throw new FeatureDisabledException(feature);
		}
	}

	/** How much of one feature the account uses, and up to how much. */
	public async usageOf(
		userId: string,
		feature: FeatureLimitsEnum.Feature,
	): Promise<IFeatureUsage> {
		const user: IUser = await this._usersService.findOneByIdOrFail(userId);

		return {
			limit: this._resolveLimit(user, feature),
			used: await this._count(userId, feature),
			enabled: this._resolveEnabled(user, feature),
		};
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
				enabled: this._resolveEnabled(user, feature),
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

		if (typeof limit === 'number') {
			return limit;
		}

		return FeatureLimitsEnum.LimitedWhenUnset.includes(feature)
			? FeatureLimitsEnum.DefaultLimits[feature]
			: null;
	}

	// Only an explicit `false` switches a feature off, so accounts saved before
	// the switch existed keep it.
	private _resolveEnabled(
		user: IUser,
		feature: FeatureLimitsEnum.Feature,
	): boolean {
		return user.limits?.enabled?.[feature] !== false;
	}

	private async _count(
		userId: string,
		feature: FeatureLimitsEnum.Feature,
	): Promise<number> {
		// Customers and categories keep their owner in `ownerUserId`. On a customer
		// `userId` is the account it is linked to (usually none), not who owns it.
		const ownerField: string = OWNER_USER_ID_FEATURES.includes(feature)
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
