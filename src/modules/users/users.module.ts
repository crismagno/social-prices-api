import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { CodesModule } from '../codes/codes.module';
import { FilesModule } from '../files/files.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	imports: [schemasModule.user, NotificationsModule, CodesModule, FilesModule],
	providers: [UsersService, HashCrypt],
	exports: [UsersService],
	controllers: [UsersController],
})
export class UsersModule {}
