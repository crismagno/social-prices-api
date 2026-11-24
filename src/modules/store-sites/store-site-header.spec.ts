import { siteHeaderOf } from './store-site-header';

describe('siteHeaderOf', () => {
	it('keeps the header in its place for a site saved before the option', () => {
		expect(siteHeaderOf(undefined)).toEqual({ isFixed: false });
		expect(siteHeaderOf('x')).toEqual({ isFixed: false });
	});

	it('keeps the header fixed only when the owner turned it on', () => {
		expect(siteHeaderOf({ isFixed: true })).toEqual({ isFixed: true });
		expect(siteHeaderOf({ isFixed: 'yes' })).toEqual({ isFixed: false });
	});
});
