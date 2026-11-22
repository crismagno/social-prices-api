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
	isAvailable: boolean;
}

export interface IPublicSiteStore {
	name: string;
	logo: string | null;
	description: string | null;
	about: string | null;
}

export type TPublicSite = Omit<IStoreSite, 'userId'>;

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
}
