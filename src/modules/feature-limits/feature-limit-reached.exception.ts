import { ForbiddenException } from '@nestjs/common';

import FeatureLimitsEnum from './interfaces/feature-limits.enum';

export const FEATURE_LIMIT_REACHED_CODE: string = 'FEATURE_LIMIT_REACHED';

export class FeatureLimitReachedException extends ForbiddenException {
	constructor(
		feature: FeatureLimitsEnum.Feature,
		limit: number,
		current: number,
	) {
		super({
			code: FEATURE_LIMIT_REACHED_CODE,
			message: `Limit of ${limit} ${feature} reached (currently ${current}).`,
			feature,
			limit,
			current,
		});
	}
}
