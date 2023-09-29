import { forwardRef, Module } from '@nestjs/common';

import { CodesModule } from '../codes/codes.module';
import AuthorizationToken from '../config/authorization/authorization-token';
import HashCrypt from '../config/hash-crypt/hash-crypt';
import { NotificationModule } from '../notification/notification.module';
import { schemasModule } from '../shared/modules/imports/schemas/schemas';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	imports: [
		schemasModule.user,
		forwardRef(() => NotificationModule),
		CodesModule,
	],
	providers: [UsersService, AuthorizationToken, HashCrypt],
	exports: [UsersService],
	controllers: [UsersController],
})
export class UsersModule {}
