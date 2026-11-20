import FeatureLimitsEnum from './feature-limits.enum';

export interface IUserLimits {
	features: Record<FeatureLimitsEnum.Feature, number>;
	enabled?: Partial<Record<FeatureLimitsEnum.Feature, boolean>>;
}

export interface IFeatureUsage {
	limit: number | null;
	used: number;
	enabled: boolean;
}

export type IFeaturesUsage = Record<FeatureLimitsEnum.Feature, IFeatureUsage>;
