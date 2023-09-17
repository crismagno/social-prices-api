import { Module } from '@nestjs/common';

import { schemasModule } from '../shared/modules/imports/schemas/schemas';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
	imports: [schemasModule.user],
	providers: [UsersService],
	exports: [UsersService],
	controllers: [UsersController],
})
export class UsersModule {}
