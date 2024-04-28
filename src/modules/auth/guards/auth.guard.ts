import { Request } from 'express';

import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import AuthorizationToken from '../../../infra/authorization/authorization-token';
import { IS_PUBLIC_KEY } from '../../../shared/decorators/custom.decorator';
import AuthEnum from '../interfaces/auth.enum';
import { IAuthPayload } from '../interfaces/auth.types';

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

		const request: any = context.switchToHttp().getRequest();

		const token: string = this._extractTokenFromHeader(request);

		if (!token) {
			throw new UnauthorizedException();
		}

		try {
			const payload: IAuthPayload =
				await this._authorizationToken.getToken<IAuthPayload>(token);

			request[AuthEnum.RequestProps.AUTH_PAYLOAD] = payload;
		} catch {
			throw new UnauthorizedException();
		}

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
