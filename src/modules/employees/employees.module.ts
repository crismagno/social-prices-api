import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
	imports: [
		schemasModule.employee,
		UsersModule,
		NotificationsModule,
		FilesModule,
	],
	controllers: [EmployeesController],
	providers: [EmployeesService, HashCrypt],
	exports: [EmployeesService],
})
export class EmployeesModule {}
