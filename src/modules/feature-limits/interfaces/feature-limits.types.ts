import FeatureLimitsEnum from './feature-limits.enum';

export interface IUserLimits {
	features: Record<FeatureLimitsEnum.Feature, number>;
}

export interface IFeatureUsage {
	limit: number | null;
	used: number;
}

export type IFeaturesUsage = Record<FeatureLimitsEnum.Feature, IFeatureUsage>;
