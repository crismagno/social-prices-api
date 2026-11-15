import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export default class ConnectTelegramBotDto {
	// What @BotFather hands out: the bot's numeric id, a colon, then the secret.
	@IsString()
	@Matches(/^\d{5,}:[A-Za-z0-9_-]{30,}$/, {
		message:
			'botToken must look like 123456789:AA... (copy it from @BotFather).',
	})
	botToken: string;
}

// Telegram's own limits for each field of the bot profile.
export const MAX_TELEGRAM_BOT_NAME_LENGTH: number = 64;
export const MAX_TELEGRAM_BOT_DESCRIPTION_LENGTH: number = 512;
export const MAX_TELEGRAM_BOT_SHORT_DESCRIPTION_LENGTH: number = 120;
// Telegram takes photos up to 10 MB; the browser sends a much smaller JPEG anyway.
export const MAX_TELEGRAM_BOT_PHOTO_BYTES: number = 10 * 1024 * 1024;

const trim = ({ value }: { value: unknown }): unknown =>
	typeof value === 'string' ? value.trim() : value;

/** Fields left out stay as they are. An empty description removes it; the name cannot be empty. */
export class UpdateTelegramBotProfileDto {
	@IsOptional()
	@Transform(trim)
	@IsString()
	@MaxLength(MAX_TELEGRAM_BOT_NAME_LENGTH)
	@Matches(/\S/, { message: 'name must not be empty.' })
	name?: string;

	@IsOptional()
	@Transform(trim)
	@IsString()
	@MaxLength(MAX_TELEGRAM_BOT_DESCRIPTION_LENGTH)
	description?: string;

	@IsOptional()
	@Transform(trim)
	@IsString()
	@MaxLength(MAX_TELEGRAM_BOT_SHORT_DESCRIPTION_LENGTH)
	shortDescription?: string;
}
