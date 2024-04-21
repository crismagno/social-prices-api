import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { AmazonFilesService } from '../../infra/services/amazon/amazon-files-service';
import { UsersModule } from '../users/users.module';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
	imports: [schemasModule.customer, UsersModule],
	controllers: [CustomersController],
	providers: [CustomersService, AmazonFilesService],
	exports: [CustomersService],
})
export class CustomersModule {}
