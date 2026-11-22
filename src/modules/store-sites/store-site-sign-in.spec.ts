import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteSignInOf } from './store-site-sign-in';

const Destination = StoreSitesEnum.SignInDestination;

describe('siteSignInOf', () => {
	it('shows the button and takes the customer to the store for a site saved before it existed', () => {
		expect(siteSignInOf(undefined)).toEqual({
			isVisible: true,
			label: null,
			destination: Destination.STORE_CHAT,
		});
	});

	it('keeps what the owner chose, with the text trimmed', () => {
		expect(
			siteSignInOf({
				isVisible: false,
				label: '  Minha conta  ',
				destination: Destination.ORDERS,
			}),
		).toEqual({
			isVisible: false,
			label: 'Minha conta',
			destination: Destination.ORDERS,
		});
	});

	it('treats an empty text as none, so the site says its own', () => {
		expect(siteSignInOf({ label: '   ' }).label).toBeNull();
	});

	it('cuts a text too long for a button', () => {
		expect(siteSignInOf({ label: 'x'.repeat(80) }).label).toHaveLength(30);
	});

	it('falls back to the store for a destination nobody knows', () => {
		expect(siteSignInOf({ destination: 'https://evil.com' }).destination).toBe(
			Destination.STORE_CHAT,
		);
	});

	it('survives garbage', () => {
		expect(siteSignInOf('x')).toEqual(siteSignInOf(undefined));
		expect(siteSignInOf({ isVisible: 'no', label: 7 })).toMatchObject({
			isVisible: true,
			label: null,
		});
	});
});
