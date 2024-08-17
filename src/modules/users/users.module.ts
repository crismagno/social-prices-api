import { forwardRef, Module } from '@nestjs/common';

import AuthorizationToken from '../../infra/authorization/authorization-token';
import { schemasModule } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { FilesService } from '../../infra/services/files/files-service';
import { CodesModule } from '../codes/codes.module';
import { EmployeesModule } from '../employees/employees.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	imports: [
		schemasModule.user,
		NotificationsModule,
		CodesModule,
		EmployeesModule,
		forwardRef(() => EmployeesModule),
	],
	providers: [UsersService, AuthorizationToken, HashCrypt, FilesService],
	exports: [UsersService],
	controllers: [UsersController],
})
export class UsersModule {}
