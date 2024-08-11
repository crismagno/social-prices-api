import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { FilesService } from '../../infra/services/files/files-service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';

@Module({
	imports: [schemasModule.employee, NotificationsModule, UsersModule],
	providers: [EmployeesService, HashCrypt, FilesService],
	exports: [EmployeesService],
	controllers: [EmployeesController],
})
export class EmployeesModule {}
