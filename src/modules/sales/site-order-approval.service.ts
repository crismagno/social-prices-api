import { Model, Types } from 'mongoose';

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { CustomersService } from '../customers/customers.service';
import { ICustomer } from '../customers/interfaces/customer.interface';
import { ISale, ISaleStore } from './interfaces/sale.interface';
import { Sale } from './interfaces/sale.schema';
import SalesEnum from './interfaces/sales.enum';

/** A site order in any of these was accepted by the store. */
const APPROVED_STATUSES: SalesEnum.Status[] = [
	SalesEnum.Status.STARTED,
	SalesEnum.Status.PROCESSING,
	SalesEnum.Status.DELIVERY,
	SalesEnum.Status.COMPLETED,
];

/**
 * An order sent from the site is only a request until the store accepts it:
 * anyone can send one, so it takes no stock while it waits. Accepting it (moving
 * it out of pending into a working status) is what takes the stock and invites
 * the customer to follow it — once, whichever way the status was changed.
 */
@Injectable()
export class SiteOrderApprovalService {
	private readonly _logger: Logger = new Logger(SiteOrderApprovalService.name);

	constructor(
		@InjectModel(schemasName.sale)
		private readonly _saleModel: Model<Sale>,
		private readonly _customersService: CustomersService,
	) {}

	/** A site order whose stock was not taken yet. */
	public isAwaitingApproval(
		sale: Pick<ISale, 'type' | 'siteOrderApprovedAt'>,
	): boolean {
		return sale?.type === SalesEnum.Type.SHOPPING && !sale.siteOrderApprovedAt;
	}

	/**
	 * Call after any change of status. `subtractStock` is the sale service's own
	 * way of taking the products out of stock.
	 */
	public async approveIfNeeded(
		sale: ISale,
		subtractStock: (saleStores: ISaleStore[]) => Promise<void>,
	): Promise<void> {
		if (
			!this.isAwaitingApproval(sale) ||
			!APPROVED_STATUSES.includes(sale.status)
		) {
			return;
		}

		// Only the request that marks it gets to take the stock: approving twice,
		// or two people approving at once, does it a single time.
		const claimed: ISale | null = await this._saleModel.findOneAndUpdate(
			{
				_id: new Types.ObjectId(String(sale._id)),
				type: SalesEnum.Type.SHOPPING,
				siteOrderApprovedAt: null,
			},
			{ $set: { siteOrderApprovedAt: new Date() } },
			{ new: true },
		);

		if (!claimed) {
			return;
		}

		await subtractStock(claimed.stores);

		// Not awaited: the store must not wait for an email server to answer.
		void this._inviteCustomers(claimed);
	}

	/** Never throws: an invite that fails must not undo the approval. */
	private async _inviteCustomers(sale: ISale): Promise<void> {
		try {
			const customerIds: string[] = [
				...new Set(
					(sale.stores ?? [])
						.map((saleStore: ISaleStore) => saleStore.customerId)
						.filter(Boolean)
						.map(String),
				),
			];

			if (!customerIds.length) {
				return;
			}

			const customers: ICustomer[] =
				await this._customersService.findByIds(customerIds);

			for (const customer of customers) {
				if (!customer.email || customer.userId || customer.invitedAt) {
					continue;
				}

				await this._inviteQuietly(customer);
			}
		} catch (error: any) {
			this._logger.error(
				`Could not invite the customers of sale ${sale?._id}: ${error?.message}`,
			);
		}
	}

	private async _inviteQuietly(customer: ICustomer): Promise<void> {
		try {
			await this._customersService.invite(
				String(customer.ownerUserId),
				String(customer._id),
			);
		} catch (error: any) {
			// The email already has an account: the order is already in its portal.
			if (error?.getResponse?.()?.code === 'CUSTOMER_ALREADY_HAS_ACCOUNT') {
				return;
			}

			this._logger.error(
				`Could not invite customer ${customer._id}: ${error?.message}`,
			);
		}
	}
}
