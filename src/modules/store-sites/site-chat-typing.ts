import { Injectable } from '@nestjs/common';

/** How long "the store is writing" lasts after the inbox last said so. */
const TYPING_MS = 6000;

/**
 * Whether the store is writing to a visitor of its site, kept in memory for a
 * few seconds: the visitor's window has no live connection, so it asks.
 */
@Injectable()
export class SiteChatTypingState {
	private readonly _until: Map<string, number> = new Map();

	public mark(conversationId: string, now: number = Date.now()): void {
		this._until.set(conversationId, now + TYPING_MS);
	}

	/** The store sent its message: the writing is over. */
	public clear(conversationId: string): void {
		this._until.delete(conversationId);
	}

	public isTyping(conversationId: string, now: number = Date.now()): boolean {
		const until: number | undefined = this._until.get(conversationId);

		if (until === undefined) {
			return false;
		}

		if (until < now) {
			this._until.delete(conversationId);

			return false;
		}

		return true;
	}
}
