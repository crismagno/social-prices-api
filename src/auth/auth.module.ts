import { Module } from '@nestjs/common';

import AuthorizationToken from '../config/authorization/authorization-token';
import HashCrypt from '../config/hash-crypt/hash-crypt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
	imports: [UsersModule],
	controllers: [AuthController],
	providers: [AuthService, AuthorizationToken, HashCrypt],
	exports: [AuthService],
})
export class AuthModule {}
