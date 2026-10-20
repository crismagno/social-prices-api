import { Injectable } from '@nestjs/common';

import { IInboxChannelAdapter } from './inbox-channel.adapter';
import InboxEnum from './interfaces/inbox.enum';

/**
 * Where the channels announce themselves. Each channel module registers its
 * adapter when it starts, so the core never imports a channel (which would be a
 * cycle: the channels import the core to store their messages).
 */
@Injectable()
export class InboxChannelRegistry {
	private readonly _adapters: Map<InboxEnum.Channel, IInboxChannelAdapter> =
		new Map();

	public register(adapter: IInboxChannelAdapter): void {
		this._adapters.set(adapter.channel, adapter);
	}

	public get(channel: InboxEnum.Channel): IInboxChannelAdapter {
		const adapter: IInboxChannelAdapter | undefined =
			this._adapters.get(channel);

		if (!adapter) {
			throw new Error(`No adapter is registered for the channel ${channel}.`);
		}

		return adapter;
	}

	public all(): IInboxChannelAdapter[] {
		return Array.from(this._adapters.values());
	}
}
