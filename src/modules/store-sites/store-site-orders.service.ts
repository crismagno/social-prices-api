import { randomUUID } from 'crypto';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import AddressEnum from '../../shared/common/address/address.enum';
import { CreateAddressDto } from '../../shared/common/address/CreateAddress.dto';
import { CreatePhoneNumberDto } from '../../shared/common/phone/CreatePhoneNumber.dto';
import PersonEnum from '../../shared/common/person/person.enum';
import PhoneNumberEnum from '../../shared/common/phone/phone-number.enum';
import { CustomersService } from '../customers/customers.service';
import { ICustomer } from '../customers/interfaces/customer.interface';
import { EmployeesService } from '../employees/employees.service';
import { IEmployee } from '../employees/interfaces/employee.interface';
import CreateSaleDto, {
	SaleStoreProductDto,
	SaleTotalsDto,
} from '../sales/interfaces/dto/createSale.dto';
import { ISale } from '../sales/interfaces/sale.interface';
import SalesEnum from '../sales/interfaces/sales.enum';
import { SalesService } from '../sales/sales.service';
import { IStore } from '../stores/interfaces/store.interface';
import CreateSiteOrderDto, {
	SiteOrderAddressDto,
	SiteOrderItemDto,
} from './interfaces/dto/createSiteOrder.dto';
import {
	IPublishedSiteContext,
	ISiteSellable,
} from './interfaces/store-sites.type';
import { IStoreSiteCheckout } from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { SiteOrderRateLimiter } from './site-order-rate-limiter';
import { siteCheckoutOf } from './store-site-checkout';
import { StoreSitesPublicService } from './store-sites-public.service';

const DEFAULT_COUNTRY = { code: 'BR', name: 'Brasil' };

interface IOrderLine {
	sellable: ISiteSellable;
	quantity: number;
}

/** What the visitor gave of what the bag of this site asks. */
interface IOrderContact {
	email: string | null;
	phoneNumber: CreatePhoneNumberDto | null;
	address: CreateAddressDto | null;
	note: string | null;
}

/**
 * An order sent from the site becomes a sale like any other, so it lands where
 * the store already works. Prices and totals are always the database's.
 */
@Injectable()
export class StoreSiteOrdersService {
	//#region Private Properties

	private readonly _logger: Logger = new Logger(StoreSiteOrdersService.name);

	//#endregion

	//#region Constructor

	constructor(
		private readonly _storeSitesPublicService: StoreSitesPublicService,
		private readonly _salesService: SalesService,
		private readonly _customersService: CustomersService,
		private readonly _employeesService: EmployeesService,
		private readonly _siteOrderRateLimiter: SiteOrderRateLimiter,
	) {}

	//#endregion

	//#region Public Methods

	/**
	 * `visitorAddress` is where the request came from, for the limits only.
	 * The order takes no stock: that happens when the store accepts it.
	 */
	public async create(
		slug: string,
		visitorAddress: string,
		createSiteOrderDto: CreateSiteOrderDto,
	): Promise<{ number: number }> {
		const { site, owner, store }: IPublishedSiteContext =
			await this._storeSitesPublicService.resolvePublishedOrFail(slug);

		const contact: IOrderContact = this._contactOrFail(
			createSiteOrderDto,
			siteCheckoutOf(site.checkout),
			store,
		);

		// Counted only now: the body is valid and the site is online, so requests
		// that are neither cannot use up the site's allowance.
		this._siteOrderRateLimiter.assertAllowed(visitorAddress, site.slug);

		const lines: IOrderLine[] = this._resolveLinesOrFail(
			this._sumQuantities(createSiteOrderDto.items),
			await this._storeSitesPublicService.findSellables(site),
		);

		const ownerUserId: string = String(owner._id);

		try {
			const admin: IEmployee =
				await this._employeesService.findAdminByUserId(ownerUserId);

			const customer: ICustomer = await this._findOrCreateCustomer({
				ownerUserId,
				storeId: String(store._id),
				name: createSiteOrderDto.buyer.name.trim(),
				contact,
			});

			const sale: ISale = await this._salesService.createManual(
				this._toCreateSaleDto({
					createSiteOrderDto,
					contact,
					lines,
					store,
					ownerUserId,
					adminEmployeeId: String(admin._id),
					customerId: String(customer._id),
				}),
			);

			// Not awaited: the visitor must not wait for an email server to answer.
			void this._inviteQuietly(ownerUserId, customer);

			return { number: sale.number };
		} catch (error: any) {
			// Whatever went wrong inside (a plan limit, a database error) is the
			// store's business: it is logged here and the visitor gets one plain
			// answer.
			this._logger.error(
				`Site order for "${site.slug}" failed: ${error?.message ?? error}`,
				error?.stack,
			);

			throw new BadRequestException({
				code: 'SITE_ORDER_FAILED',
				message: 'The order could not be sent.',
			});
		}
	}

	//#endregion

	//#region Private Methods

	/**
	 * What the visitor gave, read as the bag of this site asks it: a field the
	 * site does not ask is dropped even if sent, and one it needs must be there.
	 */
	private _contactOrFail(
		createSiteOrderDto: CreateSiteOrderDto,
		checkout: IStoreSiteCheckout,
		store: IStore,
	): IOrderContact {
		const Field = StoreSitesEnum.CheckoutField;
		const Mode = StoreSitesEnum.ChatFieldMode;

		const { buyer } = createSiteOrderDto;

		const given: Record<StoreSitesEnum.CheckoutField, unknown> = {
			[Field.EMAIL]: buyer.email?.trim().toLowerCase() || null,
			[Field.PHONE]: buyer.phoneNumber?.trim() || null,
			[Field.ADDRESS]: buyer.address ?? null,
			[Field.NOTE]: createSiteOrderDto.note?.trim() || null,
		};

		const missing: StoreSitesEnum.CheckoutField[] = [];

		Object.values(Field).forEach((field: StoreSitesEnum.CheckoutField) => {
			if (checkout.fields[field] === Mode.HIDDEN) {
				given[field] = null;
			} else if (checkout.fields[field] === Mode.REQUIRED && !given[field]) {
				missing.push(field);
			}
		});

		if (missing.length) {
			throw new BadRequestException({
				code: 'SITE_ORDER_FIELDS_MISSING',
				message: 'Some required fields are missing.',
				fields: missing,
			});
		}

		const phone = given[Field.PHONE] as string | null;
		const address = given[Field.ADDRESS] as SiteOrderAddressDto | null;

		return {
			email: given[Field.EMAIL] as string | null,
			phoneNumber: phone
				? {
						uid: randomUUID(),
						type: PhoneNumberEnum.Type.MOBILE,
						number: phone,
						messengers: [],
				  }
				: null,
			address: address ? this._toAddress(address, store) : null,
			note: given[Field.NOTE] as string | null,
		};
	}

	/**
	 * The store's customer with this email, or a new one. The new one is linked
	 * to no account: the email was typed by a visitor and proves nothing about
	 * who they are. Always resolving the customer here also keeps the sale
	 * service from looking an account up by that email. Without an email there
	 * is nothing to tell one visitor from another: the customer is a new one.
	 */
	private async _findOrCreateCustomer({
		ownerUserId,
		storeId,
		name,
		contact: { email, address, phoneNumber },
	}: {
		ownerUserId: string;
		storeId: string;
		name: string;
		contact: IOrderContact;
	}): Promise<ICustomer> {
		const existing: ICustomer | null = email
			? await this._customersService.findByOwnerUserIdAndEmail(
					ownerUserId,
					email,
			  )
			: null;

		if (existing) {
			return existing;
		}

		return await this._customersService.create(
			null,
			{
				name,
				email,
				uniqName: null,
				birthDate: null,
				// Not asked at the checkout, and a customer needs one of the known ones.
				gender: PersonEnum.Gender.OTHER,
				about: null,
				idNumber: null,
				cpf: null,
				cnpj: null,
				userId: null,
				addresses: address ? [{ ...address, isValid: true }] : [],
				phoneNumbers: phoneNumber ? [phoneNumber] : [],
				tagsIds: [],
				storesIds: [storeId],
			},
			ownerUserId,
		);
	}

	/**
	 * Emails the customer a link to create an account, so the order can be
	 * followed without waiting for the store. Once per customer, and never
	 * throws: an invite that fails must not undo the order.
	 */
	private async _inviteQuietly(
		ownerUserId: string,
		customer: ICustomer,
	): Promise<void> {
		if (!customer.email || customer.userId || customer.invitedAt) {
			return;
		}

		try {
			await this._customersService.invite(ownerUserId, String(customer._id));
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

	private _sumQuantities(items: SiteOrderItemDto[]): Map<string, number> {
		return items.reduce(
			(quantityByProductId: Map<string, number>, item: SiteOrderItemDto) =>
				quantityByProductId.set(
					item.productId,
					(quantityByProductId.get(item.productId) ?? 0) + item.quantity,
				),
			new Map<string, number>(),
		);
	}

	/** Every product asked for must be on the site and have that many in stock. */
	private _resolveLinesOrFail(
		quantityByProductId: Map<string, number>,
		sellables: ISiteSellable[],
	): IOrderLine[] {
		const sellableByProductId: Map<string, ISiteSellable> = new Map(
			sellables.map((sellable: ISiteSellable) => [
				String(sellable.product._id),
				sellable,
			]),
		);

		const lines: IOrderLine[] = [];
		const unavailableProductIds: string[] = [];

		quantityByProductId.forEach((quantity: number, productId: string) => {
			const sellable: ISiteSellable | undefined =
				sellableByProductId.get(productId);

			if (!sellable || Number(sellable.item.quantity) < quantity) {
				unavailableProductIds.push(productId);
			} else {
				lines.push({ sellable, quantity });
			}
		});

		if (unavailableProductIds.length) {
			throw new BadRequestException({
				code: 'SITE_ORDER_ITEMS_UNAVAILABLE',
				message: 'Some products are no longer available.',
				productIds: unavailableProductIds,
			});
		}

		return lines;
	}

	private _toCreateSaleDto({
		createSiteOrderDto,
		contact: { email, address, phoneNumber, note },
		lines,
		store,
		ownerUserId,
		adminEmployeeId,
		customerId,
	}: {
		createSiteOrderDto: CreateSiteOrderDto;
		contact: IOrderContact;
		lines: IOrderLine[];
		store: IStore;
		ownerUserId: string;
		adminEmployeeId: string;
		customerId: string;
	}): CreateSaleDto {
		const products: SaleStoreProductDto[] = lines.map(
			({ sellable, quantity }: IOrderLine): SaleStoreProductDto => ({
				productId: String(sellable.product._id),
				productItemId: String(sellable.item._id),
				price: sellable.item.price,
				quantity,
				barcode: sellable.item.barcode ?? null,
				sku: sellable.item.sku ?? null,
				note: null,
				discount: null,
				isValid: true,
				isCompleted: false,
			}),
		);

		const subtotalAmount: number =
			Math.round(
				products.reduce(
					(total: number, product: SaleStoreProductDto) =>
						total + product.price * product.quantity,
					0,
				) * 100,
			) / 100;

		const totals: SaleTotalsDto = {
			subtotalAmount,
			discount: null,
			tax: null,
			shipping: null,
			totalFinalAmount: subtotalAmount,
		};

		return {
			createdByUserId: ownerUserId,
			createdByEmployeeId: adminEmployeeId,
			type: SalesEnum.Type.SHOPPING,
			status: SalesEnum.Status.PENDING,
			paymentStatus: SalesEnum.PaymentStatus.PENDING,
			payments: [],
			isCreateQuote: false,
			isSendCustomerNotifications: false,
			tagsIds: [],
			categoriesIds: [],
			deliveryAt: null,
			createdDate: null,
			numberManual: null,
			noteToCustomer: null,
			note,
			totals,
			buyer: {
				userId: null,
				name: createSiteOrderDto.buyer.name.trim(),
				email,
				birthDate: null,
				// Not asked at the checkout, and a customer needs one of the known ones.
				gender: PersonEnum.Gender.OTHER,
				phoneNumber,
				address,
				idNumber: null,
				cpf: null,
				cnpj: null,
			},
			header: {
				billing: null,
				// With no address there is nowhere to deliver to: the store hands it over.
				shipping: address ? { address, trackingNumber: null } : null,
				deliveryType: address
					? SalesEnum.DeliveryType.DELIVERY
					: SalesEnum.DeliveryType.PICKUP,
			},
			stores: [
				{
					storeId: String(store._id),
					customerId,
					products,
					totals: { ...totals, discount: null },
				},
			],
		} as CreateSaleDto;
	}

	private _toAddress(
		address: SiteOrderAddressDto,
		store: IStore,
	): CreateAddressDto {
		return {
			uid: randomUUID(),
			address1: address.address1,
			address2: address.address2 || null,
			district: address.district,
			city: address.city,
			zip: address.zip,
			state: { code: address.stateCode, name: address.stateName },
			// The site sells where the store is.
			country: store.addresses?.[0]?.country ?? DEFAULT_COUNTRY,
			description: null,
			types: [AddressEnum.Type.SHIPPING],
		};
	}

	//#endregion
}
