import { Injectable, NotFoundException } from '@nestjs/common';

import AppsEnum from '../apps/interfaces/apps.enum';
import { IProductItem } from '../product-items/interfaces/product-item.interface';
import { ProductItemsService } from '../product-items/product-items.service';
import { IProduct } from '../products/interfaces/product.interface';
import { ProductsService } from '../products/products.service';
import { IStore } from '../stores/interfaces/store.interface';
import StoresEnum from '../stores/interfaces/stores.enum';
import { StoresService } from '../stores/stores.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { IStoreSite } from './interfaces/store-site.interface';
import {
	IPublicSiteProduct,
	IPublicSiteStore,
	IPublicStoreSite,
	IPublishedSiteContext,
	ISiteSellable,
	TPublicSite,
} from './interfaces/store-sites.type';
import { siteFooterOf } from './store-site-footer';
import { resolveSiteLogo, siteLogoOf } from './store-site-logo';
import { siteSizesOf } from './store-site-sizes';
import { StoreSitesService } from './store-sites.service';

/**
 * The site as anyone on the internet gets it. Every answer is built field by
 * field: a document is never passed through, so nothing internal can leak.
 */
@Injectable()
export class StoreSitesPublicService {
	//#region Constructor

	constructor(
		private readonly _storeSitesService: StoreSitesService,
		private readonly _usersService: UsersService,
		private readonly _storesService: StoresService,
		private readonly _productsService: ProductsService,
		private readonly _productItemsService: ProductItemsService,
	) {}

	//#endregion

	//#region Public Methods

	public async findBySlugOrFail(slug: string): Promise<IPublicStoreSite> {
		const { site, store }: IPublishedSiteContext =
			await this.resolvePublishedOrFail(slug);

		const sellables: ISiteSellable[] = await this.findSellables(site);

		return {
			site: {
				...this._toPublicSite(site),
				// Only what is shown: a product switched off stays unknown to visitors.
				productIds: sellables.map(
					(sellable: ISiteSellable) => sellable.product._id as any,
				),
			},
			store: this._toPublicStore(store, site),
			products: sellables.map((sellable: ISiteSellable) =>
				this._toPublicProduct(sellable),
			),
		};
	}

	/**
	 * The site, its owner and its store, only while all three allow it to be
	 * online. Any reason not to is the same "not found" for the visitor.
	 */
	public async resolvePublishedOrFail(
		slug: string,
	): Promise<IPublishedSiteContext> {
		const site: IStoreSite | null =
			await this._storeSitesService.findPublishedBySlug(slug);

		if (!site) {
			throw new NotFoundException('Site not found!');
		}

		const context: IPublishedSiteContext | null =
			await this._contextIfOnline(site);

		if (!context) {
			throw new NotFoundException('Site not found!');
		}

		return context;
	}

	/**
	 * The address of the store's site while a visitor can open it, or null. For
	 * who wants to link to the site without showing it.
	 */
	public async findOnlineSlugByStoreId(
		storeId: string,
	): Promise<string | null> {
		const site: IStoreSite | null =
			await this._storeSitesService.findPublishedByStoreId(storeId);

		if (!site) {
			return null;
		}

		return (await this._contextIfOnline(site)) ? site.slug : null;
	}

	/**
	 * The products of the site that can be shown, in the site's order, each with
	 * the item it is sold as. A product that was removed, switched off, moved to
	 * another store or left without a default item is simply not there.
	 */
	public async findSellables(site: IStoreSite): Promise<ISiteSellable[]> {
		const productIds: string[] = (site.productIds ?? []).map(String);

		if (!productIds.length) {
			return [];
		}

		const [products, items]: [IProduct[], IProductItem[]] = await Promise.all([
			this._productsService.findByIds(productIds),
			this._productItemsService.findDefaultsByProductIds(productIds),
		]);

		const storeId: string = String(site.storeId);
		const ownerUserId: string = String(site.userId);

		const productById: Map<string, IProduct> = new Map(
			products.map((product: IProduct) => [String(product._id), product]),
		);

		const itemByProductId: Map<string, IProductItem> = new Map(
			items.map((item: IProductItem) => [String(item.productId), item]),
		);

		return productIds.reduce(
			(sellables: ISiteSellable[], productId: string) => {
				const product: IProduct | undefined = productById.get(productId);
				const item: IProductItem | undefined = itemByProductId.get(productId);

				const isOfStore: boolean =
					!!product &&
					String(product.userId) === ownerUserId &&
					(product.storeIds ?? []).some(
						(productStoreId: unknown) => String(productStoreId) === storeId,
					);

				if (isOfStore && product.isActive && item?.isActive) {
					sellables.push({
						product,
						item,
						isAvailable: Number(item.quantity) > 0,
					});
				}

				return sellables;
			},
			[],
		);
	}

	//#endregion

	//#region Private Methods

	/** The published site with its owner and store, only while both allow it. */
	private async _contextIfOnline(
		site: IStoreSite,
	): Promise<IPublishedSiteContext | null> {
		const [owner, store]: [IUser | undefined, IStore | null] =
			await Promise.all([
				this._usersService.findOneById(String(site.userId)),
				this._storesService.findById(String(site.storeId)),
			]);

		const isOwnerAllowed: boolean = !!owner?.enabledApps?.includes(
			AppsEnum.App.SITE,
		);

		const isStoreOnline: boolean =
			!!store &&
			!store.softDelete?.isDeleted &&
			store.status === StoresEnum.Status.ACTIVE;

		return isOwnerAllowed && isStoreOnline ? { site, owner, store } : null;
	}

	private _toPublicSite(site: IStoreSite): TPublicSite {
		return {
			_id: site._id,
			storeId: site.storeId,
			slug: site.slug,
			templateId: site.templateId,
			isPublished: site.isPublished,
			publishedAt: site.publishedAt,
			theme: {
				primary: site.theme?.primary,
				secondary: site.theme?.secondary,
				accent: site.theme?.accent,
				background: site.theme?.background,
				text: site.theme?.text,
			},
			displayName: site.displayName?.trim() || null,
			sizes: siteSizesOf(site.sizes),
			footer: siteFooterOf(site.footer),
			hero: {
				tagline: site.hero?.tagline ?? null,
				title: site.hero?.title ?? '',
				subtitle: site.hero?.subtitle ?? null,
				backgroundImageUrl: site.hero?.backgroundImageUrl ?? null,
				featuredImageUrl: site.hero?.featuredImageUrl ?? null,
				ctaLabel: site.hero?.ctaLabel ?? null,
			},
			sections: (site.sections ?? []).map((section) => ({
				key: section.key,
				title: section.title,
				description: section.description ?? null,
				imageUrl: section.imageUrl ?? null,
				isActive: !!section.isActive,
			})),
			marquee: {
				isActive: !!site.marquee?.isActive,
				items: [...(site.marquee?.items ?? [])],
			},
			logo: siteLogoOf(site.logo),
			productIds: site.productIds,
			createdAt: site.createdAt,
			updatedAt: site.updatedAt,
		};
	}

	private _toPublicStore(store: IStore, site: IStoreSite): IPublicSiteStore {
		return {
			name: store.name,
			// What the site shows: its own image, the store's, or none.
			logo: resolveSiteLogo(site.logo, store.logo),
			description: store.description ?? null,
			about: store.about ?? null,
		};
	}

	private _toPublicProduct({
		product,
		item,
		isAvailable,
	}: ISiteSellable): IPublicSiteProduct {
		return {
			_id: String(product._id),
			name: product.name,
			description: product.description ?? null,
			price: item.price,
			mainUrl: product.mainUrl ?? null,
			filesUrl: [...(product.filesUrl ?? [])],
			isAvailable,
		};
	}

	//#endregion
}
