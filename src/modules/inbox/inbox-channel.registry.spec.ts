import { InboxChannelRegistry } from './inbox-channel.registry';
import InboxEnum from './interfaces/inbox.enum';

const adapter = (channel: InboxEnum.Channel): any => ({ channel });

describe('InboxChannelRegistry', () => {
	it('finds the adapter of a channel once its module registered it', () => {
		const registry = new InboxChannelRegistry();
		const telegram = adapter(InboxEnum.Channel.TELEGRAM);

		registry.register(telegram);

		expect(registry.get(InboxEnum.Channel.TELEGRAM)).toBe(telegram);
	});

	it('says so when a channel has no adapter, instead of answering through the wrong one', () => {
		const registry = new InboxChannelRegistry();

		expect(() => registry.get(InboxEnum.Channel.INSTAGRAM)).toThrow(
			/INSTAGRAM/,
		);
	});

	it('keeps one adapter per channel: registering again replaces it', () => {
		const registry = new InboxChannelRegistry();
		const first = adapter(InboxEnum.Channel.MESSENGER);
		const second = adapter(InboxEnum.Channel.MESSENGER);

		registry.register(first);
		registry.register(second);

		expect(registry.get(InboxEnum.Channel.MESSENGER)).toBe(second);
		expect(registry.all()).toHaveLength(1);
	});

	it('lists every channel that is registered', () => {
		const registry = new InboxChannelRegistry();

		registry.register(adapter(InboxEnum.Channel.TELEGRAM));
		registry.register(adapter(InboxEnum.Channel.INSTAGRAM));

		expect(
			registry
				.all()
				.map((a) => a.channel)
				.sort(),
		).toEqual(['INSTAGRAM', 'TELEGRAM']);
	});
});
