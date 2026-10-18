import { Module } from '@nestjs/common';

import { AesGcmCipher } from '../../../infra/aes-gcm-cipher/aes-gcm-cipher';
import { schemasModule } from '../../../infra/database/mongo/schemas';
import { FeatureLimitsModule } from '../../feature-limits/feature-limits.module';
import { AppsCoreModule } from '../core/apps-core.module';
import { TelegramChatsService } from './telegram-chats.service';
import { TelegramConnectionsService } from './telegram-connections.service';
import { TelegramMessagesService } from './telegram-messages.service';
import { TelegramBotClient } from './telegram.bot-client';
import { TelegramController } from './telegram.controller';
import { TelegramCustomersRepository } from './telegram.customers.repository';
import { TelegramService } from './telegram.service';
import { TelegramStatusProvider } from './telegram.status.provider';

/**
 * The Telegram app, self-contained: one bot per user, the webhook Telegram calls
 * when a customer writes to it, the inbox kept from that, answering from here,
 * and linking each person to a customer.
 */
@Module({
	imports: [
		AppsCoreModule,
		schemasModule.telegramConnection,
		schemasModule.telegramMessage,
		schemasModule.telegramChat,
		schemasModule.customer,
		FeatureLimitsModule,
	],
	controllers: [TelegramController],
	providers: [
		AesGcmCipher,
		TelegramService,
		TelegramBotClient,
		TelegramConnectionsService,
		TelegramMessagesService,
		TelegramChatsService,
		TelegramCustomersRepository,
		TelegramStatusProvider,
	],
	exports: [TelegramStatusProvider],
})
export class TelegramModule {}
