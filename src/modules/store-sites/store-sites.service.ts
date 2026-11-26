import { Model, Types } from 'mongoose';

import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { IProduct } from '../products/interfaces/product.interface';
import { ProductsService } from '../products/products.service';
import { IStore } from '../stores/interfaces/store.interface';
import { StoresService } from '../stores/stores.service';
import { siteAboutOf } from './store-site-about';
import { siteBlocksOf } from './store-site-blocks';
import { siteChatOf } from './store-site-chat';
import { siteCartButtonOf } from './store-site-cart-button';
import { siteImageStyleOf } from './store-site-image-style';
import { siteCheckoutOf } from './store-site-checkout';
import { siteHeaderOf } from './store-site-header';
import { siteMarqueeStyleOf } from './store-site-marquee-style';
import { siteFooterOf } from './store-site-footer';
import { heroOptionsOf, heroSlidesOf } from './store-site-hero';
import { sitePagesOf } from './store-site-pages';
import { siteCatalogOf } from './store-site-catalog';
import { siteSignInOf } from './store-site-sign-in';
import { siteLogoOf } from './store-site-logo';
import { siteSizesOf } from './store-site-sizes';
import SaveStoreSiteDto from './interfaces/dto/saveStoreSite.dto';
import { IStoreSite } from './interfaces/store-site.interface';
import { StoreSite } from './interfaces/store-site.schema';

/** The storefront of a store, as its owner sees and edits it. */
@Injectable()
export class StoreSitesService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.storeSite)
		private readonly _storeSiteModel: Model<StoreSite>,
		private readonly _storesService: StoresService,
		private readonly _productsService: ProductsService,
	) {}

	//#endregion

	//#region Public Methods

	public async findByStoreId(
		ownerUserId: string,
		storeId: string,
	): Promise<IStoreSite | null> {
		if (!(await this._findOwnStore(ownerUserId, storeId))) {
			return null;
		}

		return this._storeSiteModel.findOne({
			storeId: new Types.ObjectId(storeId),
		});
	}

	public async findPublishedByOwner(
		ownerUserId: string,
	): Promise<IStoreSite | null> {
		return this._storeSiteModel.findOne({
			userId: new Types.ObjectId(ownerUserId),
			isPublished: true,
		});
	}

	public async findPublishedBySlug(slug: string): Promise<IStoreSite | null> {
		return this._storeSiteModel.findOne({
			slug: this._normalizeSlug(slug),
			isPublished: true,
		});
	}

	public async findPublishedByStoreId(
		storeId: string,
	): Promise<IStoreSite | null> {
		if (!Types.ObjectId.isValid(storeId)) {
			return null;
		}

		return this._storeSiteModel.findOne({
			storeId: new Types.ObjectId(storeId),
			isPublished: true,
		});
	}

	public async isSlugAvailable(
		slug: string,
		exceptStoreId?: string,
	): Promise<boolean> {
		const owner: IStoreSite | null = await this._storeSiteModel.findOne({
			slug: this._normalizeSlug(slug),
		});

		return !owner || String(owner.storeId) === String(exceptStoreId);
	}

	/** Creates the site of the store or replaces its content. */
	public async save(
		ownerUserId: string,
		storeId: string,
		saveStoreSiteDto: SaveStoreSiteDto,
	): Promise<IStoreSite> {
		await this._findOwnStoreOrFail(ownerUserId, storeId);

		const slug: string = this._normalizeSlug(saveStoreSiteDto.slug);

		if (!(await this.isSlugAvailable(slug, storeId))) {
			throw new ConflictException({
				code: 'STORE_SITE_SLUG_TAKEN',
				message: 'This address is already in use.',
			});
		}

		const productIds: string[] = [...new Set(saveStoreSiteDto.productIds)];

		await this._validateProductsOfStore(ownerUserId, storeId, productIds);

		try {
			return await this._storeSiteModel.findOneAndUpdate(
				{ storeId: new Types.ObjectId(storeId) },
				{
					$set: {
						userId: new Types.ObjectId(ownerUserId),
						slug,
						templateId: saveStoreSiteDto.templateId,
						theme: saveStoreSiteDto.theme,
						displayName: saveStoreSiteDto.displayName?.trim() || null,
						sizes: siteSizesOf(saveStoreSiteDto.sizes),
						footer: siteFooterOf(saveStoreSiteDto.footer),
						signIn: siteSignInOf(saveStoreSiteDto.signIn),
						catalog: siteCatalogOf(saveStoreSiteDto.catalog),
						about: siteAboutOf(saveStoreSiteDto.about),
						pages: sitePagesOf(saveStoreSiteDto.pages),
						chat: siteChatOf(saveStoreSiteDto.chat),
						blocks: siteBlocksOf(saveStoreSiteDto.blocks),
						isLayoutCustom: saveStoreSiteDto.isLayoutCustom === true,
						header: siteHeaderOf(saveStoreSiteDto.header),
						cartButton: siteCartButtonOf(saveStoreSiteDto.cartButton),
						imageStyle: siteImageStyleOf(saveStoreSiteDto.imageStyle),
						checkout: siteCheckoutOf(saveStoreSiteDto.checkout),
						marqueeStyle: siteMarqueeStyleOf(saveStoreSiteDto.marqueeStyle),
						hero: {
							...saveStoreSiteDto.hero,
							...heroSlidesOf(saveStoreSiteDto.hero),
							options: heroOptionsOf(saveStoreSiteDto.hero?.options),
						},
						sections: saveStoreSiteDto.sections,
						marquee: saveStoreSiteDto.marquee,
						logo: siteLogoOf(saveStoreSiteDto.logo),
						productIds: productIds.map(
							(productId: string) => new Types.ObjectId(productId),
						),
					},
					// Publishing is its own action: saving the content never changes it.
					$setOnInsert: { isPublished: false, publishedAt: null },
				},
				{ upsert: true, new: true },
			);
		} catch (error: any) {
			// Two saves took the same address at the same moment: the unique index
			// let one through, and the other gets the same answer as the check above.
			if (error?.code === 11000) {
				throw new ConflictException({
					code: 'STORE_SITE_SLUG_TAKEN',
					message: 'This address is already in use.',
				});
			}

			throw error;
		}
	}

	public async setPublished(
		ownerUserId: string,
		storeId: string,
		isPublished: boolean,
	): Promise<IStoreSite> {
		const site: IStoreSite | null = await this.findByStoreId(
			ownerUserId,
			storeId,
		);

		if (!site) {
			throw new NotFoundException('Store site not found!');
		}

		return this._storeSiteModel.findOneAndUpdate(
			{ storeId: new Types.ObjectId(storeId) },
			{
				$set: {
					isPublished,
					publishedAt: isPublished ? new Date() : null,
				},
			},
			{ new: true },
		);
	}

	/** Refuses a store that is not the owner's, before anything is done to it. */
	public async assertOwnStore(
		ownerUserId: string,
		storeId: string,
	): Promise<void> {
		await this._findOwnStoreOrFail(ownerUserId, storeId);
	}

	//#endregion

	//#region Private Methods

	private _normalizeSlug(slug: string): string {
		return String(slug ?? '')
			.trim()
			.toLowerCase();
	}

	private async _findOwnStore(
		ownerUserId: string,
		storeId: string,
	): Promise<IStore | null> {
		const store: IStore | null = Types.ObjectId.isValid(storeId)
			? await this._storesService.findById(storeId)
			: null;

		if (
			!store ||
			String(store.userId) !== ownerUserId ||
			store.softDelete?.isDeleted
		) {
			return null;
		}

		return store;
	}

	private async _findOwnStoreOrFail(
		ownerUserId: string,
		storeId: string,
	): Promise<IStore> {
		const store: IStore | null = await this._findOwnStore(ownerUserId, storeId);

		if (!store) {
			throw new NotFoundException('Store not found!');
		}

		return store;
	}

	private async _validateProductsOfStore(
		ownerUserId: string,
		storeId: string,
		productIds: string[],
	): Promise<void> {
		if (!productIds.length) {
			return;
		}

		const products: IProduct[] =
			await this._productsService.findByIds(productIds);

		const isOfStore = (product: IProduct): boolean =>
			String(product.userId) === ownerUserId &&
			(product.storeIds ?? []).some(
				(productStoreId: unknown) => String(productStoreId) === storeId,
			);

		const validIds: Set<string> = new Set(
			products
				.filter(isOfStore)
				.map((product: IProduct) => String(product._id)),
		);

		if (productIds.some((productId: string) => !validIds.has(productId))) {
			throw new BadRequestException({
				code: 'STORE_SITE_INVALID_PRODUCTS',
				message: 'Some products do not belong to this store.',
			});
		}
	}

	//#endregion
}
