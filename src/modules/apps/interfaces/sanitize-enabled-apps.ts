import AppsEnum from './apps.enum';

/**
 * Whatever the client sends, only known apps survive, once each, in catalog
 * order. Keeps the stored list canonical so comparisons and diffs are stable.
 */
export const sanitizeEnabledApps = (value: unknown): AppsEnum.App[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	return Object.values(AppsEnum.App).filter((app: AppsEnum.App) =>
		value.includes(app),
	);
};
