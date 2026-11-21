import { BadRequestException } from '@nestjs/common';

import { parsePricing } from './pricing.utils';

describe('parsePricing', () => {
	it('gives null when nothing was sent', () => {
		expect(parsePricing(null)).toBeNull();
		expect(parsePricing(undefined)).toBeNull();
		expect(parsePricing('')).toBeNull();
		expect(parsePricing('null')).toBeNull();
		expect(parsePricing('undefined')).toBeNull();
	});

	it('reads the JSON string sent by the multipart form', () => {
		expect(
			parsePricing(
				JSON.stringify({
					cost: 50,
					variableExpensesPercentage: 15,
					fixedExpensesPercentage: 20,
					profitPercentage: 15,
				}),
			),
		).toEqual({
			cost: 50,
			variableExpensesPercentage: 15,
			fixedExpensesPercentage: 20,
			profitPercentage: 15,
		});
	});

	it('keeps only the known fields and coerces numeric strings', () => {
		expect(
			parsePricing({
				cost: '12.5',
				variableExpensesPercentage: '',
				fixedExpensesPercentage: null,
				profitPercentage: 10,
				other: 'x',
			} as any),
		).toEqual({
			cost: 12.5,
			variableExpensesPercentage: null,
			fixedExpensesPercentage: null,
			profitPercentage: 10,
		});
	});

	it('gives null when every field is empty', () => {
		expect(
			parsePricing({
				cost: null,
				variableExpensesPercentage: null,
				fixedExpensesPercentage: null,
				profitPercentage: null,
			}),
		).toBeNull();
	});

	it('keeps a zero as a real value', () => {
		expect(parsePricing({ cost: 0 } as any)).toEqual({
			cost: 0,
			variableExpensesPercentage: null,
			fixedExpensesPercentage: null,
			profitPercentage: null,
		});
	});

	it('rejects a value that is not a number', () => {
		expect(() => parsePricing({ cost: 'abc' } as any)).toThrow(
			BadRequestException,
		);
	});

	it('rejects a negative cost', () => {
		expect(() => parsePricing({ cost: -1 } as any)).toThrow(
			BadRequestException,
		);
	});

	it('rejects a percentage outside 0 to 100', () => {
		expect(() => parsePricing({ profitPercentage: 101 } as any)).toThrow(
			BadRequestException,
		);
		expect(() =>
			parsePricing({ variableExpensesPercentage: -5 } as any),
		).toThrow(BadRequestException);
	});

	it('rejects something that is not an object', () => {
		expect(() => parsePricing('[1,2]')).toThrow(BadRequestException);
		expect(() => parsePricing('not json')).toThrow(BadRequestException);
	});
});
