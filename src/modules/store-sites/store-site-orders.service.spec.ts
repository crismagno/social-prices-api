import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

import PersonEnum from '../../shared/common/person/person.enum';
import SalesEnum from '../sales/interfaces/sales.enum';
import CreateSiteOrderDto from './interfaces/dto/createSiteOrder.dto';
import { StoreSiteOrdersService } from './store-site-orders.service';

const OWNER = new Types.ObjectId().toString();
const STORE = new Types.ObjectId().toString();
const ADMIN = new Types.ObjectId().toString();
const P1 = new Types.ObjectId().toString();
const P2 = new Types.ObjectId().toString();
const I1 = new Types.ObjectId().toString();
const I2 = new Types.ObjectId().toString();

const sellable = (
	productId: string,
	itemId: string,
	price: number,
	quantity: number,
) => ({
	product: { _id: productId, name: 'p' },
	item: {
		_id: itemId,
		productId,
		price,
		quantity,
		barcode: `bar-${price}`,
		sku: `sku-${price}`,
	},
	isAvailable: quantity > 0,
});

const order = (patch: any = {}): CreateSiteOrderDto =>
	({
		buyer: {
			name: 'Ana Lima',
			email: 'ana@x.com',
			phoneNumber: '85999990000',
			address: {
				address1: 'Rua A, 10',
				address2: null,
				district: 'Centro',
				city: 'Fortaleza',
				stateCode: 'CE',
				stateName: 'Ceará',
				zip: '60000-000',
			},
		},
		items: [
			{ productId: P1, quantity: 2 },
			{ productId: P2, quantity: 1 },
		],
		note: 'sem pressa',
		...patch,
	}) as CreateSiteOrderDto;

const NEW_CUSTOMER = new Types.ObjectId().toString();

const build = ({
	sellables = [sellable(P1, I1, 50, 5), sellable(P2, I2, 30, 5)],
	customer = null,
	resolve,
	createManual,
	createCustomer,
	assertAllowed,
}: any = {}) => {
	const findSellables: jest.Mock = jest.fn().mockResolvedValue(sellables);

	const publicService: any = {
		resolvePublishedOrFail:
			resolve ??
			jest.fn().mockResolvedValue({
				site: {
					storeId: STORE,
					userId: OWNER,
					slug: 'atelie',
					productIds: [P1, P2],
				},
				owner: { _id: OWNER },
				store: { _id: STORE, userId: OWNER, addresses: [] },
			}),
		findSellables,
	};

	const salesService: any = {
		createManual:
			createManual ?? jest.fn().mockResolvedValue({ number: 42, _id: 'sale' }),
	};

	const customersService: any = {
		findByOwnerUserIdAndEmail: jest.fn().mockResolvedValue(customer),
		create:
			createCustomer ?? jest.fn().mockResolvedValue({ _id: NEW_CUSTOMER }),
	};

	const rateLimiter: any = { assertAllowed: assertAllowed ?? jest.fn() };

	const employeesService: any = {
		findAdminByUserId: jest.fn().mockResolvedValue({ _id: ADMIN }),
	};

	return {
		salesService,
		customersService,
		rateLimiter,
		service: new StoreSiteOrdersService(
			publicService,
			salesService,
			customersService,
			employeesService,
			rateLimiter,
		),
	};
};

const sentSale = (salesService: any): any =>
	salesService.createManual.mock.calls[0][0];

const unavailable = async (promise: Promise<unknown>): Promise<string[]> => {
	const error: any = await promise.catch((caught: unknown) => caught);

	expect(error).toBeInstanceOf(BadRequestException);
	expect(error.getResponse().code).toBe('SITE_ORDER_ITEMS_UNAVAILABLE');

	return error.getResponse().productIds;
};

describe('StoreSiteOrdersService', () => {
	it('answers with the order number only', async () => {
		const { service } = build();

		await expect(service.create('atelie', '1.1.1.1', order())).resolves.toEqual(
			{
				number: 42,
			},
		);
	});

	it('creates a pending shopping sale, attributed to the owner', async () => {
		const { service, salesService } = build();

		await service.create('atelie', '1.1.1.1', order());

		expect(sentSale(salesService)).toMatchObject({
			type: SalesEnum.Type.SHOPPING,
			status: SalesEnum.Status.PENDING,
			paymentStatus: SalesEnum.PaymentStatus.PENDING,
			payments: [],
			createdByUserId: OWNER,
			createdByEmployeeId: ADMIN,
			note: 'sem pressa',
			isSendCustomerNotifications: false,
		});
		expect(sentSale(salesService).header).toMatchObject({
			deliveryType: SalesEnum.DeliveryType.DELIVERY,
			billing: null,
		});
	});

	it('prices from the database, whatever the browser sends', async () => {
		const { service, salesService } = build();

		await service.create(
			'atelie',
			'1.1.1.1',
			order({
				items: [
					{ productId: P1, quantity: 2, price: 0.01 },
					{ productId: P2, quantity: 1, price: 0.01 },
				],
				totals: { totalFinalAmount: 0.03 },
			}),
		);

		const sale: any = sentSale(salesService);

		expect(sale.stores[0].products).toEqual([
			expect.objectContaining({
				productId: P1,
				productItemId: I1,
				price: 50,
				quantity: 2,
				barcode: 'bar-50',
				sku: 'sku-50',
			}),
			expect.objectContaining({ productId: P2, productItemId: I2, price: 30 }),
		]);
		expect(sale.totals).toEqual({
			subtotalAmount: 130,
			discount: null,
			tax: null,
			shipping: null,
			totalFinalAmount: 130,
		});
		expect(sale.stores[0].totals).toMatchObject({
			subtotalAmount: 130,
			totalFinalAmount: 130,
		});
	});

	it('ships to the address of the checkout and keeps it on the buyer', async () => {
		const { service, salesService } = build();

		await service.create('atelie', '1.1.1.1', order());

		const sale: any = sentSale(salesService);

		expect(sale.header.shipping.address).toMatchObject({
			address1: 'Rua A, 10',
			district: 'Centro',
			city: 'Fortaleza',
			zip: '60000-000',
			state: { code: 'CE', name: 'Ceará' },
			country: { code: 'BR', name: 'Brasil' },
		});
		expect(sale.buyer).toMatchObject({
			name: 'Ana Lima',
			email: 'ana@x.com',
			phoneNumber: { number: '85999990000' },
			address: { address1: 'Rua A, 10' },
			userId: null,
			// A customer cannot be created without one of the known genders.
			gender: PersonEnum.Gender.OTHER,
		});
	});

	it('refuses a product that is not on the site', async () => {
		const { service, salesService } = build();
		const stranger: string = new Types.ObjectId().toString();

		expect(
			await unavailable(
				service.create(
					'atelie',
					'1.1.1.1',
					order({ items: [{ productId: stranger, quantity: 1 }] }),
				),
			),
		).toEqual([stranger]);
		expect(salesService.createManual).not.toHaveBeenCalled();
	});

	it('refuses more than there is in stock', async () => {
		const { service, salesService } = build({
			sellables: [sellable(P1, I1, 50, 1), sellable(P2, I2, 30, 5)],
		});

		expect(
			await unavailable(service.create('atelie', '1.1.1.1', order())),
		).toEqual([P1]);
		expect(salesService.createManual).not.toHaveBeenCalled();
	});

	it('adds up the same product sent twice before checking the stock', async () => {
		const { service, salesService } = build({
			sellables: [sellable(P1, I1, 50, 3)],
		});

		expect(
			await unavailable(
				service.create(
					'atelie',
					'1.1.1.1',
					order({
						items: [
							{ productId: P1, quantity: 2 },
							{ productId: P1, quantity: 2 },
						],
					}),
				),
			),
		).toEqual([P1]);
		expect(salesService.createManual).not.toHaveBeenCalled();
	});

	it('merges the same product sent twice into one line', async () => {
		const { service, salesService } = build();

		await service.create(
			'atelie',
			'1.1.1.1',
			order({
				items: [
					{ productId: P1, quantity: 2 },
					{ productId: P1, quantity: 1 },
				],
			}),
		);

		expect(sentSale(salesService).stores[0].products).toEqual([
			expect.objectContaining({ productId: P1, quantity: 3 }),
		]);
	});

	it('reuses the customer that already has this email, whatever its case', async () => {
		const customerId: string = new Types.ObjectId().toString();
		const { service, salesService, customersService } = build({
			customer: { _id: customerId },
		});

		await service.create(
			'atelie',
			'1.1.1.1',
			order({ buyer: { ...order().buyer, email: ' Ana@X.com ' } }),
		);

		expect(customersService.findByOwnerUserIdAndEmail).toHaveBeenCalledWith(
			OWNER,
			'ana@x.com',
		);
		expect(sentSale(salesService).stores[0].customerId).toBe(customerId);
		expect(sentSale(salesService).buyer.email).toBe('ana@x.com');
	});

	it('creates a new customer of the store, linked to no account', async () => {
		const { service, salesService, customersService } = build();

		await service.create('atelie', '1.1.1.1', order());

		const [file, customerDto, ownerUserId] =
			customersService.create.mock.calls[0];

		expect(file).toBeNull();
		expect(ownerUserId).toBe(OWNER);
		expect(customerDto).toMatchObject({
			name: 'Ana Lima',
			email: 'ana@x.com',
			// The email was typed by a visitor and proves nothing about who they are.
			userId: null,
			storesIds: [STORE],
			gender: PersonEnum.Gender.OTHER,
		});
		expect(customerDto.phoneNumbers[0]).toMatchObject({
			number: '85999990000',
		});
		expect(customerDto.addresses[0]).toMatchObject({ city: 'Fortaleza' });
		expect(sentSale(salesService).stores[0].customerId).toBe(NEW_CUSTOMER);
		expect(sentSale(salesService).stores[0].storeId).toBe(STORE);
	});

	it('never lets the sale look for an account by the typed email', async () => {
		const { service, salesService } = build();

		await service.create('atelie', '1.1.1.1', order());

		// With a customer on every store, the sale service skips its own lookup.
		expect(
			sentSale(salesService).stores.every((store: any) => !!store.customerId),
		).toBe(true);
		expect(sentSale(salesService).buyer.userId).toBeNull();
	});

	it.each([
		[
			'the customer cannot be created',
			{
				createCustomer: jest.fn().mockRejectedValue(
					Object.assign(
						new Error('Limit of 50 CUSTOMERS reached (currently 50).'),
						{
							response: {
								code: 'FEATURE_LIMIT_REACHED',
								limit: 50,
								current: 50,
							},
						},
					),
				),
			},
		],
		[
			'the sale cannot be created',
			{
				createManual: jest
					.fn()
					.mockRejectedValue(new Error('E11000 duplicate key { secret: 1 }')),
			},
		],
	])(
		'tells the visitor nothing about the inside when %s',
		async (_label, options) => {
			const { service } = build(options);

			const error: any = await service
				.create('atelie', '1.1.1.1', order())
				.catch((caught: unknown) => caught);

			expect(error).toBeInstanceOf(BadRequestException);
			expect(error.getResponse()).toEqual({
				code: 'SITE_ORDER_FAILED',
				message: 'The order could not be sent.',
			});
			expect(JSON.stringify(error.getResponse())).not.toMatch(
				/limit|current|E11000|secret/i,
			);
		},
	);

	it('counts the order against the limits only once it is valid for a live site', async () => {
		const { service, rateLimiter } = build();

		await service.create('atelie', '9.9.9.9', order());

		expect(rateLimiter.assertAllowed).toHaveBeenCalledWith('9.9.9.9', 'atelie');
	});

	it('does not count an order for a site that is not online', async () => {
		const { service, rateLimiter } = build({
			resolve: jest.fn().mockRejectedValue(new NotFoundException()),
		});

		await service.create('atelie', '9.9.9.9', order()).catch(() => undefined);

		expect(rateLimiter.assertAllowed).not.toHaveBeenCalled();
	});

	it('stops before anything is created when the limit refuses', async () => {
		const refused = new Error('429');
		const { service, salesService, customersService } = build({
			assertAllowed: jest.fn(() => {
				throw refused;
			}),
		});

		await expect(service.create('atelie', '1.1.1.1', order())).rejects.toBe(
			refused,
		);
		expect(customersService.create).not.toHaveBeenCalled();
		expect(salesService.createManual).not.toHaveBeenCalled();
	});

	it('refuses a site that is not online', async () => {
		const { service, salesService } = build({
			resolve: jest.fn().mockRejectedValue(new NotFoundException()),
		});

		await expect(
			service.create('atelie', '1.1.1.1', order()),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(salesService.createManual).not.toHaveBeenCalled();
	});
});
