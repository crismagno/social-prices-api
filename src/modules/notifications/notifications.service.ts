import { FilterQuery, Model } from 'mongoose';

import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import EmailTransportService from '../../infra/services/email-transport/email-transport-service';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { CodesService } from '../codes/codes.service';
import { ICode } from '../codes/interfaces/code.interface';
import { ICustomer } from '../customers/interfaces/customer.interface';
import { IProduct } from '../products/interfaces/product.interface';
import { ISale } from '../sales/interfaces/sale.interface';
import { IStore } from '../stores/interfaces/store.interface';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { INotification } from './interfaces/notification.interface';
import { Notification } from './interfaces/notification.schema';
import { INotificationResponse } from './interfaces/notification.types';
import NotificationsEnum from './interfaces/notifications.enum';

@Injectable()
export class NotificationsService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	//#region Constructors

	constructor(
		@InjectModel(schemasName.notification)
		private readonly _notificationModel: Model<Notification>,
		private readonly _emailTransportService: EmailTransportService,
		private readonly _codesService: CodesService,
		@Inject(forwardRef(() => UsersService))
		private readonly _usersService: UsersService,
	) {
		this._logger = new Logger(NotificationsService.name);
	}

	//#endregion

	//#region Public Methods

	public async findById(
		notificationId: string,
	): Promise<INotification | undefined> {
		return this._notificationModel.findById(notificationId);
	}

	public async findByUserTableState(
		userId: string,
		tableState: ITableStateRequest<INotification>,
	): Promise<ITableStateResponse<INotification[]>> {
		const filter: FilterQuery<INotification> = {
			userId,
		};

		if (tableState.search) {
			const search = new RegExp(tableState.search, 'ig');

			filter.$or = [
				{
					content: search,
				},
				{
					title: search,
				},
				{
					subtitle: search,
				},
			];
		}

		if (tableState.filters?.type?.length) {
			filter.type = {
				$in: tableState.filters?.type as NotificationsEnum.Type[],
			};
		}

		const response: ITableStateResponse<INotification[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._notificationModel.countDocuments(filter);
		response.data = await this._notificationModel.find(
			filter,
			null,
			queryOptions<INotification>(tableState),
		);

		return response;
	}

	public async create({
		userId,
		createdByUserId,
		title,
		type,
		subtitle,
		content,
	}: {
		userId: string;
		createdByUserId: string;
		title: string;
		type: NotificationsEnum.Type;
		subtitle: string | null;
		content: any;
	}): Promise<INotification> {
		const now: Date = new Date();

		const notification = new this._notificationModel({
			content,
			title,
			subtitle,
			type,
			createdByUserId,
			userId,
			createdAt: now,
			updatedAt: now,
			isSeen: false,
		});

		const newNotification: INotification = await notification.save();

		return newNotification;
	}

	public async sendSignInCode(user: IUser): Promise<INotificationResponse> {
		const code: ICode = await this._codesService.createSignIn(user._id);

		const emailResponse: string | null =
			await this._emailTransportService.sendEmail({
				to: user.email,
				subject: `Sign In Code`,
				html: `Hi! here is your signIn code: <b>${code.value}</b>`,
			});

		return {
			email: emailResponse,
		};
	}

	public async sendRecoverPasswordCode(
		user: IUser,
	): Promise<INotificationResponse> {
		const code: ICode = await this._codesService.createRecoverPassword(
			user._id,
		);

		const emailResponse: string | null =
			await this._emailTransportService.sendEmail({
				to: user.email,
				subject: `Recover Password Code`,
				html: `Hi! here is your recover password code: <b>${code.value}</b>`,
			});

		return {
			email: emailResponse,
		};
	}

	public async sendUpdateEmailCode(
		user: IUser,
	): Promise<INotificationResponse> {
		const code: ICode = await this._codesService.createUpdateEmail(user._id);

		const emailResponse: string | null =
			await this._emailTransportService.sendEmail({
				to: user.email,
				subject: `Update Email Code`,
				html: `Hi! here is your update email code: <b>${code.value}</b>`,
			});

		return {
			email: emailResponse,
		};
	}

	public async createdStore(user: IUser, store: IStore): Promise<void> {
		const userId: string = user._id;

		const content: string = `Hi! ${user.username}, you have created a new store <b>${store.name}</b>. Congratulation!!!`;

		await this.create({
			content,
			createdByUserId: userId,
			subtitle: null,
			title: 'New Store',
			type: NotificationsEnum.Type.DEFAULT,
			userId,
		});
	}

	public async updatedStore(user: IUser, store: IStore): Promise<void> {
		const userId: string = user._id;

		const content: string = `Hi! ${user.username}, you have updated store <b>${store.name}</b>!`;

		await this.create({
			content,
			createdByUserId: userId,
			subtitle: null,
			title: 'Store Updated',
			type: NotificationsEnum.Type.DEFAULT,
			userId,
		});
	}

	public async createdProduct(user: IUser, product: IProduct): Promise<void> {
		const userId: string = user._id;

		const content: string = `Hi! ${user.name}, you have created a new product <b>${product.name}</b>. Congratulation!!!`;

		await this.create({
			content,
			createdByUserId: userId,
			subtitle: null,
			title: 'New Product',
			type: NotificationsEnum.Type.DEFAULT,
			userId,
		});
	}

	public async updatedProduct(user: IUser, product: IProduct): Promise<void> {
		const userId: string = user._id;

		const content: string = `Hi! ${user.name}, you have updated product <b>${product.name}</b>!`;

		await this.create({
			content,
			createdByUserId: userId,
			subtitle: null,
			title: 'Product Updated',
			type: NotificationsEnum.Type.DEFAULT,
			userId,
		});
	}

	public async createdCustomer(
		user: IUser,
		customer: ICustomer,
	): Promise<void> {
		const userId: string = user._id;

		const content: string = `Hi! ${user.name}, you have created a new customer <b>${customer.name}</b>. Congratulation!!!`;

		await this.create({
			content,
			createdByUserId: userId,
			subtitle: null,
			title: 'New Customer',
			type: NotificationsEnum.Type.DEFAULT,
			userId,
		});
	}

	public async updatedCustomer(
		user: IUser,
		customer: ICustomer,
	): Promise<void> {
		const userId: string = user._id;

		const content: string = `Hi! ${user.name}, you have updated customer <b>${customer.name}</b>!`;

		await this.create({
			content,
			createdByUserId: userId,
			subtitle: null,
			title: 'Customer Updated',
			type: NotificationsEnum.Type.DEFAULT,
			userId,
		});
	}

	public async countNotSeenByUser(userId: string): Promise<number> {
		return this._notificationModel.countDocuments({
			userId,
			isSeen: false,
		});
	}

	public async updateToSeen(notificationIds: string[]): Promise<void> {
		await this._notificationModel.updateMany(
			{
				_id: { $in: notificationIds },
			},
			{
				$set: {
					isSeen: true,
				},
			},
		);
	}

	public async createdManualSale(sale: ISale, user: IUser): Promise<void> {
		const userId: string = sale.createdByUserId.toString();

		const content: string = `Hi! ${user.name}, you have create a new sale. sale number: <b>${sale.number}</b>!`;

		await this.create({
			content,
			createdByUserId: userId,
			subtitle: null,
			title: 'Sale Created',
			type: NotificationsEnum.Type.NEWS,
			userId,
		});
	}

	public async updatedManualSale(sale: ISale, user: IUser): Promise<void> {
		const userId: string = sale.createdByUserId.toString();

		const content: string = `Hi! ${user.name}, you have updated a sale. sale number: <b>${sale.number}</b>!`;

		await this.create({
			content,
			createdByUserId: userId,
			subtitle: null,
			title: 'Sale Updated',
			type: NotificationsEnum.Type.NEWS,
			userId,
		});
	}

	//#endregion
}
