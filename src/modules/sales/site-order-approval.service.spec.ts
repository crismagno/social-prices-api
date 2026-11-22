import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';

import SalesEnum from './interfaces/sales.enum';
import { SiteOrderApprovalService } from './site-order-approval.service';

const OWNER = new Types.ObjectId().toString();
const CUSTOMER = new Types.ObjectId().toString();
const SALE = new Types.ObjectId().toString();

const sale = (patch: any = {}): any => ({
	_id: SALE,
	type: SalesEnum.Type.SHOPPING,
	status: SalesEnum.Status.PROCESSING,
	siteOrderApprovedAt: null,
	stores: [{ customerId: CUSTOMER }, { customerId: CUSTOMER }],
	...patch,
});

const flush = (): Promise<void> =>
	new Promise((resolve) => setImmediate(resolve));

const build = ({
	customerPatch = {},
	invite,
	claimed,
}: { customerPatch?: any; invite?: jest.Mock; claimed?: any } = {}) => {
	const saleModel: any = {
		findOneAndUpdate: jest
			.fn()
			.mockImplementation((_filter: any, update: any) =>
				Promise.resolve(
					claimed === undefined ? sale({ ...update.$set }) : claimed,
				),
			),
	};

	const customersService: any = {
		findByIds: jest.fn().mockResolvedValue([
			{
				_id: CUSTOMER,
				ownerUserId: OWNER,
				email: 'ana@x.com',
				userId: null,
				invitedAt: null,
				...customerPatch,
			},
		]),
		invite: invite ?? jest.fn().mockResolvedValue({}),
	};

	const subtractStock: jest.Mock = jest.fn().mockResolvedValue(undefined);

	return {
		saleModel,
		customersService,
		subtractStock,
		service: new SiteOrderApprovalService(saleModel, customersService),
	};
};

describe('SiteOrderApprovalService', () => {
	describe('isAwaitingApproval', () => {
		const { service } = build();

		it('is true for a site order nobody approved yet', () => {
			expect(
				service.isAwaitingApproval(sale({ status: SalesEnum.Status.PENDING })),
			).toBe(true);
		});

		it('is false once approved, and for sales that are not site orders', () => {
			expect(
				service.isAwaitingApproval(sale({ siteOrderApprovedAt: new Date() })),
			).toBe(false);
			expect(
				service.isAwaitingApproval(sale({ type: SalesEnum.Type.MANUAL })),
			).toBe(false);
		});
	});

	describe('approveIfNeeded', () => {
		it.each([
			SalesEnum.Status.PROCESSING,
			SalesEnum.Status.DELIVERY,
			SalesEnum.Status.COMPLETED,
			SalesEnum.Status.STARTED,
		])(
			'takes the stock and invites when a site order moves to %s',
			async (status) => {
				const { service, saleModel, subtractStock, customersService } = build();

				await service.approveIfNeeded(sale({ status }), subtractStock);
				await flush();

				const [filter, update] = saleModel.findOneAndUpdate.mock.calls[0];

				// Claimed atomically, so two requests cannot both approve it.
				expect(filter).toMatchObject({
					type: SalesEnum.Type.SHOPPING,
					siteOrderApprovedAt: null,
				});
				expect(String(filter._id)).toBe(SALE);
				expect(update.$set.siteOrderApprovedAt).toBeInstanceOf(Date);
				expect(subtractStock).toHaveBeenCalledTimes(1);
				expect(customersService.invite).toHaveBeenCalledWith(OWNER, CUSTOMER);
			},
		);

		it.each([
			SalesEnum.Status.PENDING,
			SalesEnum.Status.CANCELLED,
			SalesEnum.Status.ERROR,
			SalesEnum.Status.STOPPED,
			SalesEnum.Status.REFUNDED,
		])('does nothing while the order is %s', async (status) => {
			const { service, saleModel, subtractStock } = build();

			await service.approveIfNeeded(sale({ status }), subtractStock);

			expect(saleModel.findOneAndUpdate).not.toHaveBeenCalled();
			expect(subtractStock).not.toHaveBeenCalled();
		});

		it('ignores a sale that did not come from the site', async () => {
			const { service, saleModel, subtractStock } = build();

			await service.approveIfNeeded(
				sale({ type: SalesEnum.Type.MANUAL }),
				subtractStock,
			);

			expect(saleModel.findOneAndUpdate).not.toHaveBeenCalled();
			expect(subtractStock).not.toHaveBeenCalled();
		});

		it('takes the stock only once, however many times it is approved', async () => {
			// Someone else claimed it first: nothing matches the filter any more.
			const { service, subtractStock, customersService } = build({
				claimed: null,
			});

			await service.approveIfNeeded(sale(), subtractStock);
			await flush();

			expect(subtractStock).not.toHaveBeenCalled();
			expect(customersService.invite).not.toHaveBeenCalled();
		});

		it('does not wait for the email to be sent', async () => {
			let finishInvite: () => void = () => undefined;

			const invite: jest.Mock = jest.fn().mockReturnValue(
				new Promise<void>((resolve) => {
					finishInvite = resolve;
				}),
			);

			const { service, subtractStock } = build({ invite });

			await expect(
				service.approveIfNeeded(sale(), subtractStock),
			).resolves.toBeUndefined();

			finishInvite();
		});

		it.each([
			['has no email', { email: null }],
			['already has an account', { userId: new Types.ObjectId() }],
			['was already invited', { invitedAt: new Date() }],
		])('does not invite a customer that %s', async (_label, customerPatch) => {
			const { service, subtractStock, customersService } = build({
				customerPatch,
			});

			await service.approveIfNeeded(sale(), subtractStock);
			await flush();

			expect(customersService.invite).not.toHaveBeenCalled();
		});

		it.each([
			[
				'the email already has an account',
				new ConflictException({ code: 'CUSTOMER_ALREADY_HAS_ACCOUNT' }),
			],
			['the email cannot be sent', new Error('smtp down')],
		])('never fails the approval when %s', async (_label, error) => {
			const { service, subtractStock } = build({
				invite: jest.fn().mockRejectedValue(error),
			});

			await expect(
				service.approveIfNeeded(sale(), subtractStock),
			).resolves.toBeUndefined();
			await flush();
		});
	});
});
