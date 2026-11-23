import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000;
const PRUNE_EVERY_MS = 10_000;

/**
 * How often a visitor may start a chat or write in it: anyone can, without an
 * account. Counted per key (an address, a site, a visitor) over the last
 * minute, in memory, like the limit of orders.
 */
@Injectable()
export class SiteChatRateLimiter {
	private readonly _attemptsByKey: Map<string, number[]> = new Map();

	private _lastPruneAt: number = 0;

	/** Counts this attempt, or refuses it with 429 without counting it. */
	public assertAllowed(key: string, maxPerMinute: number): void {
		const now: number = Date.now();

		this._prune(now);

		const recent: number[] = (this._attemptsByKey.get(key) ?? []).filter(
			(at: number) => now - at < WINDOW_MS,
		);

		if (recent.length >= maxPerMinute) {
			throw new HttpException(
				{
					code: 'SITE_CHAT_TOO_MANY_ATTEMPTS',
					message: 'Too many messages. Wait a moment.',
				},
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}

		this._attemptsByKey.set(key, [...recent, now]);
	}

	private _prune(now: number): void {
		if (now - this._lastPruneAt < PRUNE_EVERY_MS) {
			return;
		}

		this._lastPruneAt = now;

		for (const [key, attempts] of this._attemptsByKey) {
			if (attempts.every((at: number) => now - at >= WINDOW_MS)) {
				this._attemptsByKey.delete(key);
			}
		}
	}
}
