import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { UsersModule } from '../users/users.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
	imports: [schemasModule.category, UsersModule],
	controllers: [CategoriesController],
	providers: [CategoriesService],
})
export class CategoriesModule {}
