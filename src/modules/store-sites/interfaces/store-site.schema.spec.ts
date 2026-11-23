import { model } from 'mongoose';

import { StoreSiteSchema } from './store-site.schema';

describe('StoreSiteSchema', () => {
	it('reads a site that never set its pages as having none set, not as an empty list', () => {
		// An empty list means the owner removed every page; "never set" means
		// the site gets the ready ones. The schema must keep them apart.
		const StoreSite = model('StoreSiteSchemaSpec', StoreSiteSchema);

		const site = new StoreSite({ slug: 'x' });

		expect(site.toObject().pages).toBeUndefined();
	});
});
