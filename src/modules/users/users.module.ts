import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { FilesService } from '../../infra/services/files/files-service';
import { CodesModule } from '../codes/codes.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	imports: [schemasModule.user, NotificationsModule, CodesModule],
	providers: [UsersService, HashCrypt, FilesService],
	exports: [UsersService],
	controllers: [UsersController],
})
export class UsersModule {}
