import { Module } from '@nestjs/common';

import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { APP_STATUS_PROVIDERS } from './core/status/app-status.types';
import { AppsCoreModule } from './core/apps-core.module';
import { GoogleContactsModule } from './google-contacts/google-contacts.module';
import { GoogleContactsStatusProvider } from './google-contacts/google-contacts.status.provider';
import { TelegramModule } from './telegram/telegram.module';
import { TelegramStatusProvider } from './telegram/telegram.status.provider';
import { IAppStatusProvider } from './core/status/app-status.types';

@Module({
	// A new app is a new folder with its own module: import it here and add its
	// status provider to the list below, nothing else.
	imports: [AppsCoreModule, GoogleContactsModule, TelegramModule],
	controllers: [AppsController],
	providers: [
		AppsService,
		{
			provide: APP_STATUS_PROVIDERS,
			useFactory: (
				google: GoogleContactsStatusProvider,
				telegram: TelegramStatusProvider,
			): IAppStatusProvider[] => [google, telegram],
			inject: [GoogleContactsStatusProvider, TelegramStatusProvider],
		},
	],
})
export class AppsModule {}
