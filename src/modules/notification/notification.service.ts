import { Model } from 'mongoose';

import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import EmailTransportService from '../../infra/services/email-transport/email-transport-service';
import { CodesService } from '../codes/codes.service';
import { ICode } from '../codes/interfaces/code.interface';
import { ICustomer } from '../customers/interfaces/customer.interface';
import { IProduct } from '../products/interfaces/product.interface';
import { IStore } from '../stores/interfaces/store.interface';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { INotificationResponse } from './interfaces/notification.types';
import NotificationsEnum from './interfaces/notifications.enum';

@Injectable()
export class NotificationService {
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
		this._logger = new Logger(NotificationService.name);
	}

	//#endregion

	//#region Public Methods

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
	}): Promise<any> {
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
		});

		const newNotification = await notification.save();

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

		const content: string = `Hi! ${user.firstName}, you have created a new product <b>${product.name}</b>. Congratulation!!!`;

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

		const content: string = `Hi! ${user.firstName}, you have updated product <b>${product.name}</b>!`;

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

		const content: string = `Hi! ${user.firstName}, you have created a new customer <b>${customer.firstName}</b>. Congratulation!!!`;

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

		const content: string = `Hi! ${user.firstName}, you have updated customer <b>${customer.firstName}</b>!`;

		await this.create({
			content,
			createdByUserId: userId,
			subtitle: null,
			title: 'Customer Updated',
			type: NotificationsEnum.Type.DEFAULT,
			userId,
		});
	}

	//#endregion
}
