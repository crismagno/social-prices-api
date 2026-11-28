import { IProductYearRange } from '../../products/interfaces/product.interface';
import { IProductItem } from '../../product-items/interfaces/product-item.interface';
import { IProduct } from '../../products/interfaces/product.interface';
import { IStore } from '../../stores/interfaces/store.interface';
import { IUser } from '../../users/interfaces/user.interface';
import { IStoreSite } from './store-site.interface';

/** What a visitor may know about a product: nothing about cost or stock. */
export interface IPublicSiteProduct {
	_id: string;
	name: string;
	description: string | null;
	price: number;
	mainUrl: string | null;
	filesUrl: string[];
	/** The longer text about it, shown when a visitor opens the product. */
	details: string | null;
	brand: string | null;
	colors: string[];
	/** Only the measures that were filled; null when none was. */
	dimensions: TPublicSiteProductDimensions | null;
	/** The years the product is for, when it is for some. */
	yearRange: IProductYearRange | null;
	isAvailable: boolean;
	/**
	 * The items the product is kept as, with what a visitor can filter by: a
	 * product is found by what any of them is.
	 */
	variants: IPublicSiteProductVariant[];
}

/** One item of a product, as far as the filter of the site needs it. */
export interface IPublicSiteProductVariant {
	name: string;
	price: number;
	brand: string | null;
	colors: string[];
	dimensions: TPublicSiteProductDimensions | null;
	isAvailable: boolean;
}

/** Lengths in meters, volume in liters, weight in kilos: as the product form asks. */
export type TPublicSiteProductDimensions = Partial<{
	size: string;
	height: number;
	width: number;
	length: number;
	depth: number;
	diameter: number;
	thickness: number;
	volume: number;
	weight: number;
}>;

export interface IPublicSiteStore {
	name: string;
	logo: string | null;
	description: string | null;
	about: string | null;
}

export type TPublicSite = Omit<IStoreSite, 'userId'>;

/** A site that is online, as a list of sites shows it: enough to recognise it and open it. */
export interface IPublicSiteCard {
	slug: string;
	/** The name at its top: its own, else the store's. */
	name: string;
	logo: string | null;
	/** What its entrance says. */
	title: string;
	subtitle: string | null;
	/** A picture of its entrance, when it has one. */
	imageUrl: string | null;
	/** Its main colour, for a card with no picture. */
	color: string | null;
	/** Whether it has a bag: off, it only shows. */
	sells: boolean;
}

export interface IPublicStoreSite {
	site: TPublicSite;
	store: IPublicSiteStore;
	products: IPublicSiteProduct[];
}

/** A site that may be shown, with who owns it and which store it sells for. */
export interface IPublishedSiteContext {
	site: IStoreSite;
	owner: IUser;
	store: IStore;
}

/** A product of the site with the item it is sold as (its default one). */
export interface ISiteSellable {
	product: IProduct;
	item: IProductItem;
	isAvailable: boolean;
	/** Every active item of the product, the default one among them. */
	items: IProductItem[];
}
