import { Inject, Injectable } from '@nestjs/common';

import { AppNotIntegratedException } from './apps.exceptions';
import { IAppIntegration } from './interfaces/apps.types';

export const APP_INTEGRATIONS: symbol = Symbol('APP_INTEGRATIONS');

/**
 * The only place that knows which apps have an integration. Adding an app means
 * adding its class to the APP_INTEGRATIONS provider in AppsModule, nothing else.
 */
@Injectable()
export class AppsRegistry {
	private readonly _byId: Map<string, IAppIntegration> = new Map();

	constructor(@Inject(APP_INTEGRATIONS) integrations: IAppIntegration[]) {
		for (const integration of integrations) {
			this._byId.set(integration.appId, integration);
		}
	}

	public has(appId: string): boolean {
		return this._byId.has(appId);
	}

	public get(appId: string): IAppIntegration {
		const integration: IAppIntegration | undefined = this._byId.get(appId);

		if (!integration) {
			throw new AppNotIntegratedException(appId);
		}

		return integration;
	}
}
