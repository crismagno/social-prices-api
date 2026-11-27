import { Injectable, NotFoundException } from '@nestjs/common';

import AppsEnum from '../apps/interfaces/apps.enum';
import { IProductItem } from '../product-items/interfaces/product-item.interface';
import { ProductItemsService } from '../product-items/product-items.service';
import {
	IProduct,
	IProductDimensions,
} from '../products/interfaces/product.interface';
import { ProductsService } from '../products/products.service';
import { IStore } from '../stores/interfaces/store.interface';
import StoresEnum from '../stores/interfaces/stores.enum';
import { StoresService } from '../stores/stores.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { IStoreSite } from './interfaces/store-site.interface';
import {
	IPublicSiteCard,
	IPublicSiteProduct,
	IPublicSiteStore,
	IPublicStoreSite,
	IPublishedSiteContext,
	ISiteSellable,
	TPublicSite,
	TPublicSiteProductDimensions,
} from './interfaces/store-sites.type';
import { siteAboutOf } from './store-site-about';
import { publicBlocksOf } from './store-site-blocks';
import { siteChatOf } from './store-site-chat';
import { siteCartButtonOf } from './store-site-cart-button';
import { siteBackdropOf } from './store-site-backdrop';
import { siteFontsOf } from './store-site-fonts';
import { siteImageStyleOf } from './store-site-image-style';
import { siteCheckoutOf } from './store-site-checkout';
import { siteHeaderOf } from './store-site-header';
import { siteMarqueeStyleOf } from './store-site-marquee-style';
import { siteFooterOf } from './store-site-footer';
import { heroOptionsOf, heroSlidesOf } from './store-site-hero';
import { sitePagesOf } from './store-site-pages';
import { siteCatalogOf } from './store-site-catalog';
import { siteSignInOf } from './store-site-sign-in';
import { resolveSiteLogo, siteLogoOf } from './store-site-logo';
import { siteSizesOf } from './store-site-sizes';
import { StoreSitesService } from './store-sites.service';
import { sanitizeRichText } from '../../shared/utils/rich-text/rich-text';

/** The numeric measures of a product, in the order the site lists them. */
const MEASURES = [
	'height',
	'width',
	'length',
	'depth',
	'diameter',
	'thickness',
	'volume',
	'weight',
] as const;

/** The most sites a list shows: each is checked before it is listed. */
const MAX_LISTED_SITES = 100;

/** Lower case and without accents, so "atelie" finds "Ateliê". */
const normalize = (text: unknown): string =>
	String(text ?? '')
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.trim();

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
	 * The sites a visitor can open now, newest first, as cards of a list. The
	 * same check as opening one: a site whose owner or store no longer allows it
	 * is not listed. `search` narrows by the name or by what the entrance says.
	 */
	public async findOnlineCards(search?: string): Promise<IPublicSiteCard[]> {
		const sites: IStoreSite[] =
			await this._storeSitesService.findPublished(MAX_LISTED_SITES);

		const contexts: (IPublishedSiteContext | null)[] = await Promise.all(
			sites.map((site: IStoreSite) => this._contextIfOnline(site)),
		);

		const typed: string = normalize(search);

		return contexts
			.filter(
				(
					context: IPublishedSiteContext | null,
				): context is IPublishedSiteContext => !!context,
			)
			.map(
				({ site, store }: IPublishedSiteContext): IPublicSiteCard => ({
					slug: site.slug,
					name: site.displayName?.trim() || store.name,
					logo: resolveSiteLogo(site.logo, store.logo),
					title: site.hero?.title ?? '',
					subtitle: site.hero?.subtitle ?? null,
					imageUrl:
						site.hero?.backgroundImageUrl ||
						site.hero?.featuredImageUrl ||
						null,
					color: site.theme?.primary ?? null,
					sells: siteCartButtonOf(site.cartButton).isVisible,
				}),
			)
			.filter(
				(card: IPublicSiteCard) =>
					!typed ||
					[card.name, card.title, card.subtitle ?? ''].some((text: string) =>
						normalize(text).includes(typed),
					),
			);
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
		const pages = sitePagesOf(site.pages);

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
			// Never set, the store's name; emptied on purpose, no name at the top.
			displayName:
				typeof site.displayName === 'string' ? site.displayName.trim() : null,
			sizes: siteSizesOf(site.sizes),
			footer: siteFooterOf(site.footer),
			signIn: siteSignInOf(site.signIn),
			catalog: siteCatalogOf(site.catalog),
			about: siteAboutOf(site.about),
			pages,
			chat: siteChatOf(site.chat),
			isLayoutCustom: site.isLayoutCustom === true,
			header: siteHeaderOf(site.header),
			cartButton: siteCartButtonOf(site.cartButton),
			imageStyle: siteImageStyleOf(site.imageStyle),
			checkout: siteCheckoutOf(site.checkout),
			marqueeStyle: siteMarqueeStyleOf(site.marqueeStyle),
			fonts: siteFontsOf(site.fonts),
			backdrop: siteBackdropOf(site.backdrop),
			blocks: publicBlocksOf(
				site.blocks,
				pages.map((page) => page.key),
			),
			hero: {
				tagline: site.hero?.tagline ?? null,
				title: site.hero?.title ?? '',
				subtitle: site.hero?.subtitle ?? null,
				backgroundImageUrl: site.hero?.backgroundImageUrl ?? null,
				...heroSlidesOf(site.hero),
				featuredImageUrl: site.hero?.featuredImageUrl ?? null,
				ctaLabel: site.hero?.ctaLabel ?? null,
				options: heroOptionsOf(site.hero?.options),
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
			// Cleaned again on the way out: what a visitor gets can never run.
			description: sanitizeRichText(product.description),
			price: item.price,
			mainUrl: product.mainUrl ?? null,
			filesUrl: [...(product.filesUrl ?? [])],
			details: sanitizeRichText(product.details),
			brand: product.brand?.trim() || null,
			colors: (product.colors ?? []).filter(
				(color: unknown) => typeof color === 'string' && !!color.trim(),
			),
			dimensions: this._toPublicDimensions(product.dimensions),
			isAvailable,
		};
	}

	/** The measures that were filled, in the order a visitor reads them. */
	private _toPublicDimensions(
		dimensions: IProductDimensions | null | undefined,
	): TPublicSiteProductDimensions | null {
		const filled: TPublicSiteProductDimensions = {};

		const size: string = dimensions?.size?.trim() ?? '';

		if (size) {
			filled.size = size;
		}

		for (const key of MEASURES) {
			const value: number = Number(dimensions?.[key]);

			if (Number.isFinite(value) && value > 0) {
				filled[key] = value;
			}
		}

		return Object.keys(filled).length ? filled : null;
	}

	//#endregion
}
