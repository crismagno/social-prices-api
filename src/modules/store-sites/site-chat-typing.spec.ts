import { SiteChatTypingState } from './site-chat-typing';

describe('SiteChatTypingState', () => {
	it('says the store is writing for a few seconds after it said so', () => {
		const state = new SiteChatTypingState();

		state.mark('c1', 1000);

		expect(state.isTyping('c1', 1000 + 5000)).toBe(true);
		expect(state.isTyping('c1', 1000 + 7000)).toBe(false);
		expect(state.isTyping('c2', 1000)).toBe(false);
	});

	it('stops at once when the store has sent its message', () => {
		const state = new SiteChatTypingState();

		state.mark('c1', 1000);
		state.clear('c1');

		expect(state.isTyping('c1', 1500)).toBe(false);
	});
});
