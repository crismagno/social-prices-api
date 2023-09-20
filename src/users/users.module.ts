import { Module } from '@nestjs/common';

import AuthorizationToken from '../config/authorization/authorization-token';
import HashCrypt from '../config/hash-crypt/hash-crypt';
import { schemasModule } from '../shared/modules/imports/schemas/schemas';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	imports: [schemasModule.user],
	providers: [UsersService, AuthorizationToken, HashCrypt],
	exports: [UsersService],
	controllers: [UsersController],
})
export class UsersModule {}
