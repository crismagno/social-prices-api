import FeatureLimitsEnum from './interfaces/feature-limits.enum';
import { FeatureLimitReachedException } from './feature-limit-reached.exception';
import { FeatureLimitsService } from './feature-limits.service';

const USER_ID: string = '507f1f77bcf86cd799439011';

const buildModel = (count: number): any => ({
	countDocuments: jest.fn().mockResolvedValue(count),
});

const buildService = (
	user: any,
	counts: Partial<Record<FeatureLimitsEnum.Feature, number>> = {},
) => {
	const models: any = {};

	for (const feature of Object.values(FeatureLimitsEnum.Feature)) {
		models[feature] = buildModel(counts[feature] ?? 0);
	}

	const usersService: any = {
		findOneByIdOrFail: jest.fn().mockResolvedValue(user),
	};

	const service = new FeatureLimitsService(
		models[FeatureLimitsEnum.Feature.PRODUCTS],
		models[FeatureLimitsEnum.Feature.PRODUCT_ITEMS],
		models[FeatureLimitsEnum.Feature.CUSTOMERS],
		models[FeatureLimitsEnum.Feature.EMPLOYEES],
		models[FeatureLimitsEnum.Feature.STORES],
		models[FeatureLimitsEnum.Feature.CATEGORIES],
		models[FeatureLimitsEnum.Feature.TAGS],
		usersService,
	);

	return { service, models };
};

const userWithLimits = (features: any): any => ({
	_id: USER_ID,
	limits: { features },
});

describe('FeatureLimitsService', () => {
	describe('assertCanCreate', () => {
		it('allows anything when the user has no limits at all', async () => {
			const { service } = buildService({ _id: USER_ID }, { products: 9999 });

			await expect(
				service.assertCanCreate(USER_ID, FeatureLimitsEnum.Feature.PRODUCTS),
			).resolves.toBeUndefined();
		});

		it('allows anything when the feature entry is null', async () => {
			const { service } = buildService(userWithLimits({ products: null }), {
				products: 9999,
			});

			await expect(
				service.assertCanCreate(USER_ID, FeatureLimitsEnum.Feature.PRODUCTS),
			).resolves.toBeUndefined();
		});

		it('allows creating while under the limit', async () => {
			const { service } = buildService(userWithLimits({ stores: 2 }), {
				stores: 1,
			});

			await expect(
				service.assertCanCreate(USER_ID, FeatureLimitsEnum.Feature.STORES),
			).resolves.toBeUndefined();
		});

		it('refuses when already at the limit', async () => {
			const { service } = buildService(userWithLimits({ stores: 1 }), {
				stores: 1,
			});

			await expect(
				service.assertCanCreate(USER_ID, FeatureLimitsEnum.Feature.STORES),
			).rejects.toBeInstanceOf(FeatureLimitReachedException);
		});

		it('allows a batch that lands exactly on the limit', async () => {
			const { service } = buildService(userWithLimits({ tags: 10 }), {
				tags: 7,
			});

			await expect(
				service.assertCanCreate(USER_ID, FeatureLimitsEnum.Feature.TAGS, 3),
			).resolves.toBeUndefined();
		});

		it('refuses a batch that goes one over the limit', async () => {
			const { service } = buildService(userWithLimits({ tags: 10 }), {
				tags: 7,
			});

			await expect(
				service.assertCanCreate(USER_ID, FeatureLimitsEnum.Feature.TAGS, 4),
			).rejects.toBeInstanceOf(FeatureLimitReachedException);
		});

		it('reports feature, limit and current in the exception body', async () => {
			const { service } = buildService(userWithLimits({ employees: 3 }), {
				employees: 3,
			});

			try {
				await service.assertCanCreate(
					USER_ID,
					FeatureLimitsEnum.Feature.EMPLOYEES,
				);
				fail('should have thrown');
			} catch (error: any) {
				expect(error.getResponse()).toMatchObject({
					code: 'FEATURE_LIMIT_REACHED',
					feature: 'employees',
					limit: 3,
					current: 3,
				});
			}
		});

		it('does not count soft deleted documents', async () => {
			const { service, models } = buildService(
				userWithLimits({ customers: 5 }),
				{ customers: 0 },
			);

			await service.assertCanCreate(
				USER_ID,
				FeatureLimitsEnum.Feature.CUSTOMERS,
			);

			expect(models.customers.countDocuments).toHaveBeenCalledWith({
				userId: USER_ID,
				'softDelete.isDeleted': { $ne: true },
			});
		});

		it('counts categories by ownerUserId', async () => {
			const { service, models } = buildService(
				userWithLimits({ categories: 5 }),
			);

			await service.assertCanCreate(
				USER_ID,
				FeatureLimitsEnum.Feature.CATEGORIES,
			);

			expect(models.categories.countDocuments).toHaveBeenCalledWith({
				ownerUserId: USER_ID,
				'softDelete.isDeleted': { $ne: true },
			});
		});
	});

	describe('getUsage', () => {
		it('returns limit and used per feature, null limit when unlimited', async () => {
			const { service } = buildService(userWithLimits({ products: 500 }), {
				products: 12,
				tags: 4,
			});

			const usage = await service.getUsage(USER_ID);

			expect(usage.products).toEqual({ limit: 500, used: 12 });
			expect(usage.tags).toEqual({ limit: null, used: 4 });
		});
	});
});
