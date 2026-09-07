import { IProduct } from '../products/interfaces/product.interface';

/**
 * Fields a product shares with its default product item.
 *
 * A product and its default item are kept identical, so every place that
 * creates or updates the default item copies exactly this set. Keeping the
 * list here means a new product field only has to be added once.
 *
 * Ownership and identity fields (userId, createdAt, productId, isDefault) are
 * deliberately left out: they belong to the caller, and an update must not
 * overwrite them.
 */
export const mapProductToDefaultProductItemFields = (product: IProduct) => ({
	name: product.name,
	description: product.description,
	filesUrl: product.filesUrl || [],
	isActive: product.isActive,
	price: product.price,
	quantity: product.quantity,
	details: product.details,
	storeIds: product.storeIds,
	categoriesIds: product.categoriesIds,
	tagsIds: product.tagsIds,
	mainUrl: product.mainUrl,
	barcode: product.barcode,
	sku: product.sku,
	QRCode: product.QRCode,
	updatedAt: product.updatedAt,
	brand: product.brand,
	releaseDate: product.releaseDate,
	expirationDate: product.expirationDate,
	colors: product.colors,
	dynamicFields: product.dynamicFields ?? [],
	dimensions: product.dimensions,
	historicPrices: product.historicPrices,
	previousBarcodes: product.previousBarcodes,
	uploadFilename: product.uploadFilename,
});
