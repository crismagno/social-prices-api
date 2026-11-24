import { IStoreSiteHeader } from './interfaces/store-site.interface';

/**
 * How the top of the site behaves, whatever was stored or sent: it stays in
 * its place unless the owner chose to keep it on screen while scrolling.
 */
export const siteHeaderOf = (header: unknown): IStoreSiteHeader => {
	const source: Record<string, unknown> =
		header && typeof header === 'object' && !Array.isArray(header)
			? (header as Record<string, unknown>)
			: {};

	return { isFixed: source.isFixed === true };
};
