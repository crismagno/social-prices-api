import { IsString, Matches } from 'class-validator';

export default class ConnectTelegramBotDto {
	// What @BotFather hands out: the bot's numeric id, a colon, then the secret.
	@IsString()
	@Matches(/^\d{5,}:[A-Za-z0-9_-]{30,}$/, {
		message:
			'botToken must look like 123456789:AA... (copy it from @BotFather).',
	})
	botToken: string;
}
