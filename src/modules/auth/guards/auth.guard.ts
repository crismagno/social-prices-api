import { Request } from 'express';

import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import AuthorizationToken from '../../../infra/authorization/authorization-token';
import {
	ALLOWS_UNVALIDATED_SIGN_IN_KEY,
	IS_MANAGER_ROUTE_KEY,
	IS_PUBLIC_KEY,
} from '../../../shared/decorators/custom.decorator';
import AuthEnum from '../interfaces/auth.enum';
import { IDecodedTokenPayload } from '../interfaces/auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
	//#region Constructor

	constructor(
		private _authorizationToken: AuthorizationToken,
		private _reflector: Reflector,
	) {}

	//#endregion

	// #region Public Methods

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic: boolean = this._reflector.getAllAndOverride<boolean>(
			IS_PUBLIC_KEY,
			[context.getHandler(), context.getClass()],
		);

		if (isPublic) {
			return true;
		}

		const isManagerRoute: boolean =
			!!this._reflector.getAllAndOverride<boolean>(IS_MANAGER_ROUTE_KEY, [
				context.getHandler(),
				context.getClass(),
			]);

		const allowsUnvalidatedSignIn: boolean =
			!!this._reflector.getAllAndOverride<boolean>(
				ALLOWS_UNVALIDATED_SIGN_IN_KEY,
				[context.getHandler(), context.getClass()],
			);

		const request: any = context.switchToHttp().getRequest();

		const token: string = this._extractTokenFromHeader(request);

		if (!token) {
			throw new UnauthorizedException({
				error: AuthEnum.AuthErrors.UNAUTHORIZED,
				type: AuthEnum.AuthTypes.NO_TOKEN,
				message: AuthEnum.AuthErrors.UNAUTHORIZED,
			});
		}

		let payload: IDecodedTokenPayload;

		try {
			payload =
				await this._authorizationToken.getToken<IDecodedTokenPayload>(token);
		} catch {
			throw new UnauthorizedException({
				error: AuthEnum.AuthErrors.UNAUTHORIZED,
				type: AuthEnum.AuthTypes.PAYLOAD_ERROR,
				message: AuthEnum.AuthErrors.UNAUTHORIZED,
			});
		}

		const isManagerPayload: boolean =
			(payload?.type ?? AuthEnum.PayloadType.USER) ===
			AuthEnum.PayloadType.MANAGER;

		if (isManagerRoute !== isManagerPayload) {
			throw new UnauthorizedException({
				error: AuthEnum.AuthErrors.UNAUTHORIZED,
				type: AuthEnum.AuthTypes.WRONG_IDENTITY,
				message: AuthEnum.AuthErrors.UNAUTHORIZED,
			});
		}

		if (
			isManagerPayload &&
			!payload?.isSignInValidated &&
			!allowsUnvalidatedSignIn
		) {
			throw new UnauthorizedException({
				error: AuthEnum.AuthErrors.UNAUTHORIZED,
				type: AuthEnum.AuthTypes.SIGN_IN_NOT_VALIDATED,
				message: AuthEnum.AuthErrors.UNAUTHORIZED,
			});
		}

		request[AuthEnum.RequestProps.AUTH_PAYLOAD] = payload;

		return true;
	}

	// #endregion

	// #region Private Methods

	private _extractTokenFromHeader(request: Request): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? [];

		return type === 'Bearer' ? token : undefined;
	}

	//#endregion
}
