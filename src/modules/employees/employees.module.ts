import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { FilesUploadsModule } from '../files-uploads/files-uploads.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SocketsModule } from '../sockets/sockets.module';
import { TagsModule } from '../tags/tags.module';
import { UsersModule } from '../users/users.module';
import { EmployeesValidationService } from './employees-validation.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
	imports: [
		schemasModule.employee,
		UsersModule,
		NotificationsModule,
		FilesModule,
		TagsModule,
		SocketsModule,
		FilesUploadsModule,
	],
	controllers: [EmployeesController],
	providers: [EmployeesService, HashCrypt, EmployeesValidationService],
	exports: [EmployeesService],
})
export class EmployeesModule {}
