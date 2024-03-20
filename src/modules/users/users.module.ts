import {
  forwardRef,
  Module,
} from '@nestjs/common';

import AuthorizationToken from '../../infra/authorization/authorization-token';
import { schemasModule } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import {
  AmazonFilesService,
} from '../../infra/services/amazon/amazon-files-service';
import { CodesModule } from '../codes/codes.module';
import { NotificationModule } from '../notification/notification.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	imports: [
		schemasModule.user,
		forwardRef(() => NotificationModule),
		CodesModule,
	],
	providers: [UsersService, AuthorizationToken, HashCrypt, AmazonFilesService],
	exports: [UsersService],
	controllers: [UsersController],
})
export class UsersModule {}
