import { IStoreSiteChat } from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const MAX_LABEL_LENGTH = 30;
const MAX_TITLE_LENGTH = 60;
const MAX_GREETING_LENGTH = 300;

const textOf = (value: unknown, max: number): string | null =>
	typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;

const oneOf = <T extends string>(
	value: unknown,
	options: T[],
	fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

/**
 * The chat of the site, whatever was stored or sent. Off until the owner turns
 * it on; a name is always asked, the email by default, the phone if given.
 */
export const siteChatOf = (chat: unknown): IStoreSiteChat => {
	const source: Record<string, unknown> =
		chat && typeof chat === 'object' ? (chat as Record<string, unknown>) : {};

	const modes: StoreSitesEnum.ChatFieldMode[] = Object.values(
		StoreSitesEnum.ChatFieldMode,
	);

	return {
		isActive: source.isActive === true,
		position: oneOf(
			source.position,
			Object.values(StoreSitesEnum.ChatPosition),
			StoreSitesEnum.ChatPosition.RIGHT,
		),
		icon: oneOf(
			source.icon,
			Object.values(StoreSitesEnum.ChatIcon),
			StoreSitesEnum.ChatIcon.MESSAGE,
		),
		buttonLabel: textOf(source.buttonLabel, MAX_LABEL_LENGTH),
		title: textOf(source.title, MAX_TITLE_LENGTH),
		greeting: textOf(source.greeting, MAX_GREETING_LENGTH),
		emailField: oneOf(
			source.emailField,
			modes,
			StoreSitesEnum.ChatFieldMode.REQUIRED,
		),
		phoneField: oneOf(
			source.phoneField,
			modes,
			StoreSitesEnum.ChatFieldMode.OPTIONAL,
		),
	};
};
