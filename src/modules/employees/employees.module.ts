import { forwardRef, Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { FilesService } from '../../infra/services/files/files-service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
	imports: [
		schemasModule.employee,
		forwardRef(() => UsersModule),
		NotificationsModule,
	],
	controllers: [EmployeesController],
	providers: [EmployeesService, HashCrypt, FilesService],
	exports: [EmployeesService],
})
export class EmployeesModule {}
