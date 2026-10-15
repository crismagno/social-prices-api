import AppsEnum from './apps.enum';
import { sanitizeEnabledApps } from './sanitize-enabled-apps';

describe('sanitizeEnabledApps', () => {
	it('keeps valid apps in catalog order and removes duplicates', () => {
		expect(
			sanitizeEnabledApps([
				AppsEnum.App.TELEGRAM,
				AppsEnum.App.GOOGLE_CONTACTS,
				AppsEnum.App.TELEGRAM,
			]),
		).toEqual([AppsEnum.App.GOOGLE_CONTACTS, AppsEnum.App.TELEGRAM]);
	});

	it('drops unknown values', () => {
		expect(sanitizeEnabledApps(['NOPE', AppsEnum.App.INSTAGRAM, 7])).toEqual([
			AppsEnum.App.INSTAGRAM,
		]);
	});

	it('returns an empty list for non-arrays', () => {
		expect(sanitizeEnabledApps(undefined)).toEqual([]);
		expect(sanitizeEnabledApps(null)).toEqual([]);
		expect(sanitizeEnabledApps('GOOGLE_CONTACTS')).toEqual([]);
	});
});
