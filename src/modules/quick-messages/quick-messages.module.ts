import { Module } from '@nestjs/common';

import { schemasModule } from '../../infra/database/mongo/schemas';
import { AppsCoreModule } from '../apps/core/apps-core.module';
import { EmployeesModule } from '../employees/employees.module';
import { FilesModule } from '../files/files.module';
import { InboxModule } from '../inbox/inbox.module';
import { UsersModule } from '../users/users.module';
import { QuickMessagesSenderService } from './quick-messages-sender.service';
import { QuickMessagesController } from './quick-messages.controller';
import { QuickMessagesService } from './quick-messages.service';

/** Ready answers for the chat: text and files, sent with one click. */
@Module({
	imports: [
		schemasModule.quickMessage,
		schemasModule.customer,
		AppsCoreModule,
		EmployeesModule,
		FilesModule,
		InboxModule,
		UsersModule,
	],
	controllers: [QuickMessagesController],
	providers: [QuickMessagesService, QuickMessagesSenderService],
})
export class QuickMessagesModule {}
