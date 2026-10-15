import { AppNotIntegratedException } from './apps.exceptions';
import { AppsRegistry } from './apps.registry';
import AppsEnum from './interfaces/apps.enum';

const integration: any = { appId: AppsEnum.App.GOOGLE_CONTACTS };

describe('AppsRegistry', () => {
	it('resolves a registered integration by app id', () => {
		const registry = new AppsRegistry([integration]);

		expect(registry.has(AppsEnum.App.GOOGLE_CONTACTS)).toBe(true);
		expect(registry.get(AppsEnum.App.GOOGLE_CONTACTS)).toBe(integration);
	});

	it('reports catalog-only apps as not integrated', () => {
		const registry = new AppsRegistry([integration]);

		expect(registry.has(AppsEnum.App.INSTAGRAM)).toBe(false);
		expect(() => registry.get(AppsEnum.App.INSTAGRAM)).toThrow(
			AppNotIntegratedException,
		);
	});
});
