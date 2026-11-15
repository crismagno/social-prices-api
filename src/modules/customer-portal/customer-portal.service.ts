import { escapeRegExp } from 'lodash';
import mongoose, { FilterQuery, Model } from 'mongoose';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { ISale } from '../sales/interfaces/sale.interface';
import { Sale } from '../sales/interfaces/sale.schema';
import SalesEnum from '../sales/interfaces/sales.enum';
import { Product } from '../products/interfaces/product.schema';
import { Store } from '../stores/interfaces/store.schema';
import {
	ICustomerPortalBuyer,
	ICustomerPortalDashboard,
	ICustomerPortalSale,
	ICustomerPortalStore,
} from './interfaces/customer-portal.types';

const LAST_PURCHASES: number = 5;

// Sales that may still be paid; cancelled and refunded ones owe nothing.
const OPEN_PAYMENT_STATUSES: SalesEnum.PaymentStatus[] = [
	SalesEnum.PaymentStatus.PENDING,
	SalesEnum.PaymentStatus.PARTIALLY,
];
const CLOSED_STATUSES: SalesEnum.Status[] = [
	SalesEnum.Status.CANCELLED,
	SalesEnum.Status.REFUNDED,
];

/**
 * What a customer account can see: only the sales made for them, from any
 * store, matched by their user or their email. Read only, by design.
 */
@Injectable()
export class CustomerPortalService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.sale) private readonly _saleModel: Model<Sale>,
		@InjectModel(schemasName.store) private readonly _storeModel: Model<Store>,
		@InjectModel(schemasName.product)
		private readonly _productModel: Model<Product>,
	) {}

	//#endregion

	//#region Public Methods

	public async findSales(
		buyer: ICustomerPortalBuyer,
		tableState: ITableStateRequest<ISale>,
	): Promise<ITableStateResponse<ICustomerPortalSale[]>> {
		const filter: FilterQuery<ISale> = this._buyerFilter(buyer);

		if (tableState?.search) {
			const number: number = Number(tableState.search);

			if (Number.isFinite(number)) {
				filter.number = number;
			}
		}

		if (tableState?.filters?.status?.length) {
			filter.status = { $in: tableState.filters.status };
		}

		if (tableState?.filters?.paymentStatus?.length) {
			filter.paymentStatus = { $in: tableState.filters.paymentStatus };
		}

		if (tableState?.filters?.stores?.length) {
			filter['stores.storeId'] = { $in: tableState.filters.stores };
		}

		const rangeDate = tableState?.filters?.rangeDate;

		if (rangeDate?.startDate && rangeDate?.endDate) {
			filter.createdAt = {
				$gte: new Date(rangeDate.startDate),
				$lte: new Date(rangeDate.endDate),
			};
		}

		const total: number = await this._saleModel.countDocuments(filter);

		const sales: ISale[] = await this._saleModel.find(
			filter,
			null,
			queryOptions<ISale>(tableState ?? ({} as ITableStateRequest<ISale>)),
		);

		return { total, data: await this._withNames(sales) };
	}

	/** The stores the customer bought in, for the stores filter. Names only. */
	public async findStores(
		buyer: ICustomerPortalBuyer,
	): Promise<ICustomerPortalStore[]> {
		const storeIds: unknown[] = await this._saleModel.distinct(
			'stores.storeId',
			this._buyerFilter(buyer),
		);

		const names: Record<string, string> = await this._namesOf(
			this._storeModel,
			storeIds.map(String),
		);

		return Object.entries(names)
			.map(([_id, name]) => ({ _id, name }))
			.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
	}

	public async findSale(
		buyer: ICustomerPortalBuyer,
		saleId: string,
	): Promise<ICustomerPortalSale> {
		if (!mongoose.isValidObjectId(saleId)) {
			throw new NotFoundException('Sale not found!');
		}

		const sale: ISale | null = await this._saleModel.findOne({
			...this._buyerFilter(buyer),
			_id: saleId,
		});

		if (!sale) {
			throw new NotFoundException('Sale not found!');
		}

		return (await this._withNames([sale]))[0];
	}

	public async getDashboard(
		buyer: ICustomerPortalBuyer,
	): Promise<ICustomerPortalDashboard> {
		const sales: ISale[] = await this._saleModel.find(
			this._buyerFilter(buyer),
			null,
			{ sort: { createdAt: -1 } },
		);

		let totalSpent: number = 0;
		let openAmount: number = 0;

		for (const sale of sales) {
			const total: number = sale.totals?.totalFinalAmount ?? 0;

			if (sale.status === SalesEnum.Status.COMPLETED) {
				totalSpent += total;
			}

			if (
				OPEN_PAYMENT_STATUSES.includes(sale.paymentStatus) &&
				!CLOSED_STATUSES.includes(sale.status)
			) {
				const paid: number = (sale.payments ?? [])
					.filter(
						(payment) => payment.status === SalesEnum.PaymentStatus.COMPLETED,
					)
					.reduce((sum: number, payment) => sum + (payment.amount ?? 0), 0);

				openAmount += Math.max(0, total - paid);
			}
		}

		return {
			totalPurchases: sales.length,
			totalSpent,
			openAmount,
			lastPurchases: await this._withNames(sales.slice(0, LAST_PURCHASES)),
		};
	}

	//#endregion

	//#region Private Methods

	private _buyerFilter(buyer: ICustomerPortalBuyer): FilterQuery<ISale> {
		return {
			softDelete: null,
			$or: [
				{ 'buyer.userId': buyer.userId },
				{
					'buyer.email': new RegExp(`^${escapeRegExp(buyer.email)}$`, 'i'),
				},
			],
		};
	}

	/**
	 * The names of the stores and products of these sales, and nothing else
	 * about them: a customer has no access to the stores' data.
	 */
	private async _withNames(sales: ISale[]): Promise<ICustomerPortalSale[]> {
		const plains: ISale[] = sales.map((sale: any) =>
			typeof sale.toObject === 'function' ? sale.toObject() : sale,
		);

		const storeIds: string[] = [
			...new Set(
				plains.flatMap((sale: ISale) =>
					(sale.stores ?? []).map((store) => String(store.storeId)),
				),
			),
		];

		const productIds: string[] = [
			...new Set(
				plains.flatMap((sale: ISale) =>
					(sale.stores ?? []).flatMap((store) =>
						(store.products ?? []).map((product) => String(product.productId)),
					),
				),
			),
		];

		const [storeNames, products] = await Promise.all([
			this._namesOf(this._storeModel, storeIds),
			this._productsInfoOf(productIds),
		]);

		return plains.map(
			(sale: ISale) =>
				({
					...sale,
					storesNames: this._pick(storeNames, sale, 'stores'),
					productsNames: this._pick(products.names, sale, 'products'),
					productsImages: this._pick(products.images, sale, 'products'),
				}) as ICustomerPortalSale,
		);
	}

	private async _namesOf(
		model: Model<any>,
		ids: string[],
	): Promise<Record<string, string>> {
		if (!ids.length) {
			return {};
		}

		const documents: any[] = await model.find(
			{ _id: { $in: ids } },
			{ name: 1 },
		);

		return Object.fromEntries(
			documents.map((document: any) => [String(document._id), document.name]),
		);
	}

	/** Name and main picture of each product: what a customer may see of it. */
	private async _productsInfoOf(ids: string[]): Promise<{
		names: Record<string, string>;
		images: Record<string, string>;
	}> {
		if (!ids.length) {
			return { names: {}, images: {} };
		}

		const products: any[] = await this._productModel.find(
			{ _id: { $in: ids } },
			{ name: 1, filesUrl: 1 },
		);

		return {
			names: Object.fromEntries(
				products.map((product: any) => [String(product._id), product.name]),
			),
			images: Object.fromEntries(
				products.map((product: any) => [
					String(product._id),
					product.filesUrl?.[0] ?? null,
				]),
			),
		};
	}

	/** Only the values that belong to this sale. */
	private _pick(
		names: Record<string, string>,
		sale: ISale,
		kind: 'stores' | 'products',
	): Record<string, string> {
		const ids: string[] =
			kind === 'stores'
				? (sale.stores ?? []).map((store) => String(store.storeId))
				: (sale.stores ?? []).flatMap((store) =>
						(store.products ?? []).map((product) => String(product.productId)),
				  );

		return Object.fromEntries(ids.map((id: string) => [id, names[id] ?? null]));
	}

	//#endregion
}
