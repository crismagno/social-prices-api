import { Model, Types } from 'mongoose';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { FeatureLimitsService } from '../feature-limits/feature-limits.service';
import FeatureLimitsEnum from '../feature-limits/interfaces/feature-limits.enum';
import { IFeatureUsage } from '../feature-limits/interfaces/feature-limits.types';
import {
	CreateStoreSiteMockDto,
	UpdateStoreSiteMockDto,
} from './interfaces/dto/saveStoreSiteMock.dto';
import SaveStoreSiteDto from './interfaces/dto/saveStoreSite.dto';
import {
	IStoreSiteMock,
	StoreSiteMock,
} from './interfaces/store-site-mock.schema';
import { siteContentOf } from './store-site-content';
import { StoreSitesService } from './store-sites.service';

const FEATURE = FeatureLimitsEnum.Feature.SITE_MOCKS;

/** The mocks of a store's site, and how many more the account may keep. */
export interface IStoreSiteMocksList {
	mocks: Omit<IStoreSiteMock, 'content'>[];
	limit: number | null;
	used: number;
}

/**
 * Copies of a site its owner keeps aside, to open again in the editor and go
 * on changing. How many an account keeps is a limit a manager can raise.
 */
@Injectable()
export class StoreSiteMocksService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.storeSiteMock)
		private readonly _mockModel: Model<StoreSiteMock>,
		private readonly _storeSitesService: StoreSitesService,
		private readonly _featureLimitsService: FeatureLimitsService,
	) {}

	//#endregion

	//#region Public Methods

	public async list(
		ownerUserId: string,
		storeId: string,
	): Promise<IStoreSiteMocksList> {
		await this._storeSitesService.assertOwnStore(ownerUserId, storeId);

		const [mocks, usage]: [IStoreSiteMock[], IFeatureUsage] = await Promise.all(
			[
				this._mockModel
					.find({
						userId: new Types.ObjectId(ownerUserId),
						storeId: new Types.ObjectId(storeId),
					})
					.select('-content')
					.sort({ updatedAt: -1 })
					.lean<IStoreSiteMock[]>(),
				this._featureLimitsService.usageOf(ownerUserId, FEATURE),
			],
		);

		return { mocks, limit: usage.limit, used: usage.used };
	}

	public async findOne(
		ownerUserId: string,
		mockId: string,
	): Promise<IStoreSiteMock> {
		return await this._findOwnOrFail(ownerUserId, mockId);
	}

	public async create(
		ownerUserId: string,
		storeId: string,
		dto: CreateStoreSiteMockDto,
	): Promise<IStoreSiteMock> {
		await this._storeSitesService.assertOwnStore(ownerUserId, storeId);
		await this._featureLimitsService.assertCanCreate(ownerUserId, FEATURE);

		return await this._mockModel.create({
			userId: new Types.ObjectId(ownerUserId),
			storeId: new Types.ObjectId(storeId),
			name: dto.name.trim(),
			templateId: dto.content.templateId,
			content: this._contentOf(dto.content),
		});
	}

	public async update(
		ownerUserId: string,
		mockId: string,
		dto: UpdateStoreSiteMockDto,
	): Promise<IStoreSiteMock> {
		await this._findOwnOrFail(ownerUserId, mockId);

		const $set: Record<string, unknown> = {};

		if (dto.name !== undefined) {
			$set.name = dto.name.trim();
		}

		if (dto.content) {
			$set.templateId = dto.content.templateId;
			$set.content = this._contentOf(dto.content);
		}

		return await this._mockModel.findOneAndUpdate(
			{ _id: new Types.ObjectId(mockId) },
			{ $set },
			{ new: true },
		);
	}

	public async remove(ownerUserId: string, mockId: string): Promise<void> {
		await this._findOwnOrFail(ownerUserId, mockId);

		await this._mockModel.deleteOne({ _id: new Types.ObjectId(mockId) });
	}

	//#endregion

	//#region Private Methods

	/**
	 * Checked as a site is when saved. The address is not kept: opening a mock
	 * never moves the site. The products stay as chosen; the editor drops the
	 * ones the store no longer sells when it opens the mock.
	 */
	private _contentOf(dto: SaveStoreSiteDto): Record<string, unknown> {
		return {
			...siteContentOf(dto),
			productIds: [...new Set(dto.productIds ?? [])],
		};
	}

	private async _findOwnOrFail(
		ownerUserId: string,
		mockId: string,
	): Promise<IStoreSiteMock> {
		const mock: IStoreSiteMock | null = Types.ObjectId.isValid(mockId)
			? await this._mockModel
					.findOne({
						_id: new Types.ObjectId(mockId),
						userId: new Types.ObjectId(ownerUserId),
					})
					.lean<IStoreSiteMock>()
			: null;

		if (!mock) {
			throw new NotFoundException('Site mock not found!');
		}

		return mock;
	}

	//#endregion
}
