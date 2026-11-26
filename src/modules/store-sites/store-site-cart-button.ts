import { IStoreSiteCartButton } from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';

const MAX_LABEL_LENGTH = 20;

const oneOf = <T extends string>(
	value: unknown,
	options: T[],
	fallback: T,
): T => (options.includes(value as T) ? (value as T) : fallback);

/**
 * The cart button of a site, whatever was stored or sent: shown as the
 * template draws it unless the owner changed it. A button with no icon always
 * keeps its words, so there is never an empty button.
 */
export const siteCartButtonOf = (button: unknown): IStoreSiteCartButton => {
	const source: Record<string, unknown> =
		button && typeof button === 'object' && !Array.isArray(button)
			? (button as Record<string, unknown>)
			: {};

	const icon: StoreSitesEnum.CartButtonIcon = oneOf(
		source.icon,
		Object.values(StoreSitesEnum.CartButtonIcon),
		StoreSitesEnum.CartButtonIcon.NONE,
	);

	return {
		isVisible: source.isVisible !== false,
		icon,
		label:
			typeof source.label === 'string' && source.label.trim()
				? source.label.trim().slice(0, MAX_LABEL_LENGTH)
				: null,
		isLabelVisible:
			source.isLabelVisible !== false ||
			icon === StoreSitesEnum.CartButtonIcon.NONE,
		size: oneOf(
			source.size,
			Object.values(StoreSitesEnum.CartButtonSize),
			StoreSitesEnum.CartButtonSize.MEDIUM,
		),
	};
};
