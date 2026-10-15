import { IsArray, IsEnum } from 'class-validator';

import AppsEnum from '../apps.enum';

export default class UpdateUserAppsDto {
	@IsArray()
	@IsEnum(AppsEnum.App, { each: true })
	enabledApps: AppsEnum.App[];
}
