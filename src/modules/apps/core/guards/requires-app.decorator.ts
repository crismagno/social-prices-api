import { CustomDecorator, SetMetadata } from '@nestjs/common';

import AppsEnum from '../../interfaces/apps.enum';

export const REQUIRES_APP_KEY: string = 'requiresApp';

/**
 * Marks a route (or a whole controller) as belonging to one app. Used with
 * AppEnabledGuard, which then only lets the request in when the manager has
 * enabled that app for the user.
 */
export const RequiresApp = (app: AppsEnum.App): CustomDecorator<string> =>
	SetMetadata(REQUIRES_APP_KEY, app);
