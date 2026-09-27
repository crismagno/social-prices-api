import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { ManagersModule } from '../managers/managers.module';
import { UsersModule } from '../users/users.module';
import { FeedbacksController } from './feedbacks.controller';
import { FeedbacksService } from './feedbacks.service';
import { ManagerFeedbacksController } from './manager-feedbacks.controller';

@Module({
	// ManagersModule supplies ManagersService to ManagerLevelGuard, which
	// re-loads the acting manager on every request to the manager controller.
	imports: [schemasModule.feedback, UsersModule, ManagersModule],
	controllers: [FeedbacksController, ManagerFeedbacksController],
	providers: [FeedbacksService],
})
export class FeedbacksModule {}
