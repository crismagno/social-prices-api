import { IStoreSiteSignIn } from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const MAX_LABEL_LENGTH = 30;

/**
 * The sign-in button of a site, whatever was stored or sent. A site saved
 * before it existed shows it, and sends the customer to the store.
 */
export const siteSignInOf = (signIn: unknown): IStoreSiteSignIn => {
	const source: Record<string, unknown> =
		signIn && typeof signIn === 'object'
			? (signIn as Record<string, unknown>)
			: {};

	const destination: StoreSitesEnum.SignInDestination = Object.values(
		StoreSitesEnum.SignInDestination,
	).includes(source.destination as StoreSitesEnum.SignInDestination)
		? (source.destination as StoreSitesEnum.SignInDestination)
		: StoreSitesEnum.SignInDestination.STORE_CHAT;

	return {
		isVisible: source.isVisible !== false,
		label:
			typeof source.label === 'string' && source.label.trim()
				? source.label.trim().slice(0, MAX_LABEL_LENGTH)
				: null,
		destination,
	};
};
