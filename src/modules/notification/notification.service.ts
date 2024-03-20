import {
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';

import EmailTransportService
  from '../../infra/services/email-transport/email-transport-service';
import { CodesService } from '../codes/codes.service';
import { ICode } from '../codes/interfaces/code.interface';
import { IStore } from '../stores/interfaces/store.interface';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import { INotificationResponse } from './interfaces/notification.types';

@Injectable()
export class NotificationService {
	//#region Constructors

	constructor(
		private readonly _emailTransportService: EmailTransportService,
		private readonly _codesService: CodesService,
		@Inject(forwardRef(() => UsersService))
		private readonly _usersService: UsersService,
	) {}

	//#endregion

	//#region Public Methods

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

	public async sendCreateStore(
		store: IStore,
		user: IUser,
	): Promise<INotificationResponse> {
		const emailResponse: string | null =
			await this._emailTransportService.sendEmail({
				to: user.email,
				subject: `New store`,
				html: `Hi! ${user.username}, you have created a new store <b>${store.name}</b>. Congratulation!!!`,
			});

		return {
			email: emailResponse,
		};
	}

	public async sendUpdateStore(
		store: IStore,
		user: IUser,
	): Promise<INotificationResponse> {
		const emailResponse: string | null =
			await this._emailTransportService.sendEmail({
				to: user.email,
				subject: `Update store`,
				html: `Hi! ${user.username}, you have updated store <b>${store.name}</b>!`,
			});

		return {
			email: emailResponse,
		};
	}

	//#endregion
}
