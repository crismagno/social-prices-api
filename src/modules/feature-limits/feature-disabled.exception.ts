import { ForbiddenException } from '@nestjs/common';

import FeatureLimitsEnum from './interfaces/feature-limits.enum';

export const FEATURE_DISABLED_CODE: string = 'FEATURE_DISABLED';

export class FeatureDisabledException extends ForbiddenException {
	constructor(feature: FeatureLimitsEnum.Feature) {
		super({
			code: FEATURE_DISABLED_CODE,
			message: `The feature ${feature} is not active for this account.`,
			feature,
		});
	}
}
