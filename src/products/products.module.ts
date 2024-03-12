import { Module } from '@nestjs/common';

import { schemasModule } from '../infra/database/mongo/schemas';
import { AmazonFilesService } from '../infra/services/amazon/amazon-files-service';
import { UsersModule } from '../users/users.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
	imports: [schemasModule.product, UsersModule],
	controllers: [ProductsController],
	providers: [ProductsService, AmazonFilesService],
	exports: [ProductsService],
})
export class ProductsModule {}
