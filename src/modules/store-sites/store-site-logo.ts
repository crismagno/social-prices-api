import { IStoreSiteLogo } from './interfaces/store-site.interface';

/** The logo setting of a site, also for one saved before it was editable. */
export const siteLogoOf = (
	logo: Partial<IStoreSiteLogo> | null | undefined,
): IStoreSiteLogo => ({
	isActive: logo?.isActive ?? true,
	imageUrl: logo?.imageUrl?.trim() || null,
});

/** The image the site shows as its logo, or null when it shows none. */
export const resolveSiteLogo = (
	logo: Partial<IStoreSiteLogo> | null | undefined,
	storeLogo: string | null | undefined,
): string | null => {
	const { isActive, imageUrl }: IStoreSiteLogo = siteLogoOf(logo);

	return isActive ? imageUrl ?? storeLogo ?? null : null;
};
