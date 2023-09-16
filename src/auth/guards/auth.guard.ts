import { Request } from 'express';

import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { jwtConstants } from '../../config/authorization/jwt';
import { IS_PUBLIC_KEY } from '../../shared/decorators/custom.decorator';
import { IAuthPayload } from '../interfaces/auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private _jwtService: JwtService,
		private _reflector: Reflector,
	) {}

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
			const payload: IAuthPayload = await this._jwtService.verifyAsync(token, {
				secret: jwtConstants.secret(),
			});

			request['user'] = payload;
		} catch {
			throw new UnauthorizedException();
		}

		return true;
	}

	// #endregion Public Methods

	// #region Private Methods

	private _extractTokenFromHeader(request: Request): string | undefined {
		const [type, token] = request.headers.authorization?.split(' ') ?? [];
		return type === 'Bearer' ? token : undefined;
	}

	//#endregion Private Methods
}
