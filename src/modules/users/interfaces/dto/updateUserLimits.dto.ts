import { Type } from 'class-transformer';
import {
	IsBoolean,
	IsInt,
	IsOptional,
	Min,
	ValidateNested,
} from 'class-validator';

class FeatureLimitsDto {
	@IsOptional() @IsInt() @Min(0) products?: number;
	@IsOptional() @IsInt() @Min(0) 'product-items'?: number;
	@IsOptional() @IsInt() @Min(0) customers?: number;
	@IsOptional() @IsInt() @Min(0) employees?: number;
	@IsOptional() @IsInt() @Min(0) stores?: number;
	@IsOptional() @IsInt() @Min(0) categories?: number;
	@IsOptional() @IsInt() @Min(0) tags?: number;
	@IsOptional() @IsInt() @Min(0) 'quick-messages'?: number;
}

class FeaturesEnabledDto {
	@IsOptional() @IsBoolean() 'quick-messages'?: boolean;
}

export default class UpdateUserLimitsDto {
	@ValidateNested()
	@Type(() => FeatureLimitsDto)
	features: FeatureLimitsDto;

	@IsOptional()
	@ValidateNested()
	@Type(() => FeaturesEnabledDto)
	enabled?: FeaturesEnabledDto;
}
