import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import StoreSitesEnum from './interfaces/store-sites.enum';

const WINDOW_MS = 60_000;
const PRUNE_EVERY_MS = 10_000;

/**
 * Orders are open to anyone, so they are limited twice: a visitor may only send
 * a few a minute, and a site may only receive so many from everyone together.
 *
 * It is asked only for an order that is valid and for a site that is online, so
 * garbage requests cannot use up a site's allowance, and the keys it remembers
 * are bounded by real sites and real visitors.
 *
 * The visitor is the address of the connection (`request.ip`). Behind a reverse
 * proxy that is the proxy unless TRUST_PROXY_HOPS is set (see main.ts); a
 * forwarded-for header is never read here, because anyone can write one.
 *
 * Counted in memory: enough for one API process, which is how it runs today.
 */
@Injectable()
export class SiteOrderRateLimiter {
	private readonly _attemptsByKey: Map<string, number[]> = new Map();

	private _lastPruneAt: number = 0;

	public get trackedKeys(): number {
		return this._attemptsByKey.size;
	}

	/** Counts this order, or refuses it with 429 without counting it. */
	public assertAllowed(address: string, slug: string): void {
		const now: number = Date.now();

		this._prune(now);

		const visitorKey: string = `visitor:${address || 'unknown'}`;
		const siteKey: string = `site:${slug}`;

		const visitorAttempts: number[] = this._recent(visitorKey, now);
		const siteAttempts: number[] = this._recent(siteKey, now);

		if (
			visitorAttempts.length >= StoreSitesEnum.ORDERS_PER_MINUTE ||
			siteAttempts.length >= StoreSitesEnum.ORDERS_PER_MINUTE_PER_SITE
		) {
			throw new HttpException(
				{
					code: 'SITE_ORDER_TOO_MANY_ATTEMPTS',
					message: 'Too many orders. Try again in a minute.',
				},
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}

		this._attemptsByKey.set(visitorKey, [...visitorAttempts, now]);
		this._attemptsByKey.set(siteKey, [...siteAttempts, now]);
	}

	private _recent(key: string, now: number): number[] {
		return (this._attemptsByKey.get(key) ?? []).filter(
			(attemptAt: number) => now - attemptAt < WINDOW_MS,
		);
	}

	/** Drops whoever went quiet. At most once every few seconds, never per call. */
	private _prune(now: number): void {
		if (now - this._lastPruneAt < PRUNE_EVERY_MS) {
			return;
		}

		this._lastPruneAt = now;

		for (const [key, attempts] of this._attemptsByKey) {
			if (attempts.every((attemptAt: number) => now - attemptAt >= WINDOW_MS)) {
				this._attemptsByKey.delete(key);
			}
		}
	}
}
