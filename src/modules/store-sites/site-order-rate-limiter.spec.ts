import { HttpException } from '@nestjs/common';

import { SiteOrderRateLimiter } from './site-order-rate-limiter';

const statusOf = (run: () => unknown): number | null => {
	try {
		run();

		return null;
	} catch (error: any) {
		return error instanceof HttpException ? error.getStatus() : -1;
	}
};

describe('SiteOrderRateLimiter', () => {
	afterEach(() => jest.useRealTimers());

	it('lets a visitor send five orders a minute and refuses the sixth', () => {
		const limiter = new SiteOrderRateLimiter();

		for (let attempt = 0; attempt < 5; attempt++) {
			expect(
				statusOf(() => limiter.assertAllowed('1.1.1.1', 'atelie')),
			).toBeNull();
		}

		expect(statusOf(() => limiter.assertAllowed('1.1.1.1', 'atelie'))).toBe(
			429,
		);
	});

	it('counts each visitor on its own', () => {
		const limiter = new SiteOrderRateLimiter();

		for (let attempt = 0; attempt < 5; attempt++) {
			limiter.assertAllowed('1.1.1.1', 'atelie');
		}

		expect(
			statusOf(() => limiter.assertAllowed('2.2.2.2', 'atelie')),
		).toBeNull();
	});

	it('lets through again once the minute passed', () => {
		jest.useFakeTimers();

		const limiter = new SiteOrderRateLimiter();

		for (let attempt = 0; attempt < 5; attempt++) {
			limiter.assertAllowed('1.1.1.1', 'atelie');
		}

		jest.advanceTimersByTime(61_000);

		expect(
			statusOf(() => limiter.assertAllowed('1.1.1.1', 'atelie')),
		).toBeNull();
	});

	it('caps one site at sixty orders a minute and leaves the others alone', () => {
		const limiter = new SiteOrderRateLimiter();

		for (let visitor = 0; visitor < 60; visitor++) {
			limiter.assertAllowed(`200.0.0.${visitor}`, 'atelie');
		}

		expect(statusOf(() => limiter.assertAllowed('201.9.9.9', 'atelie'))).toBe(
			429,
		);
		expect(
			statusOf(() => limiter.assertAllowed('201.9.9.9', 'outra-loja')),
		).toBeNull();
	});

	it('does not count a refused attempt, so being refused never extends the wait', () => {
		jest.useFakeTimers();

		const limiter = new SiteOrderRateLimiter();

		for (let attempt = 0; attempt < 5; attempt++) {
			limiter.assertAllowed('1.1.1.1', 'atelie');
		}

		jest.advanceTimersByTime(30_000);
		statusOf(() => limiter.assertAllowed('1.1.1.1', 'atelie'));
		jest.advanceTimersByTime(31_000);

		expect(
			statusOf(() => limiter.assertAllowed('1.1.1.1', 'atelie')),
		).toBeNull();
	});

	it('forgets visitors that went quiet, so it does not grow without end', () => {
		jest.useFakeTimers();

		const limiter = new SiteOrderRateLimiter();

		for (let visitor = 0; visitor < 500; visitor++) {
			limiter.assertAllowed(
				`10.0.${Math.floor(visitor / 250)}.${visitor % 250}`,
				`loja-${visitor}`,
			);
		}

		jest.advanceTimersByTime(120_000);
		limiter.assertAllowed('9.9.9.9', 'atelie');

		expect(limiter.trackedKeys).toBeLessThanOrEqual(2);
	});
});
