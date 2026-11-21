import { BadRequestException } from '@nestjs/common';

import { IPricing } from './pricing.interface';

const MAX_PERCENTAGE: number = 100;

const EMPTY_TEXTS: string[] = ['', 'null', 'undefined'];

const PERCENTAGE_FIELDS: (keyof IPricing)[] = [
	'variableExpensesPercentage',
	'fixedExpensesPercentage',
	'profitPercentage',
];

const parseNumber = (name: string, value: any): number | null => {
	if (value === null || value === undefined || `${value}`.trim() === '') {
		return null;
	}

	const parsed: number = Number(value);

	if (Number.isNaN(parsed)) {
		throw new BadRequestException(`Pricing "${name}" expects a number value.`);
	}

	if (parsed < 0) {
		throw new BadRequestException(`Pricing "${name}" cannot be negative.`);
	}

	return parsed;
};

const parseJson = (pricing: string): any => {
	try {
		return JSON.parse(pricing);
	} catch {
		throw new BadRequestException('Pricing is not valid.');
	}
};

/**
 * Normalizes the pricing sent by the client before it is persisted.
 *
 * The forms post multipart data, so it arrives as a JSON string. Empty values
 * become null, and a pricing with nothing filled in is stored as null.
 */
export const parsePricing = (
	pricing?: IPricing | string | null,
): IPricing | null => {
	if (!pricing) {
		return null;
	}

	// A multipart form turns an empty field into the text "null" or "undefined".
	if (typeof pricing === 'string' && EMPTY_TEXTS.includes(pricing.trim())) {
		return null;
	}

	const value: any = typeof pricing === 'string' ? parseJson(pricing) : pricing;

	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new BadRequestException('Pricing is not valid.');
	}

	const parsed: IPricing = {
		cost: parseNumber('cost', value.cost),
		variableExpensesPercentage: parseNumber(
			'variableExpensesPercentage',
			value.variableExpensesPercentage,
		),
		fixedExpensesPercentage: parseNumber(
			'fixedExpensesPercentage',
			value.fixedExpensesPercentage,
		),
		profitPercentage: parseNumber('profitPercentage', value.profitPercentage),
	};

	for (const field of PERCENTAGE_FIELDS) {
		if (parsed[field] !== null && parsed[field] > MAX_PERCENTAGE) {
			throw new BadRequestException(
				`Pricing "${field}" cannot be greater than ${MAX_PERCENTAGE}.`,
			);
		}
	}

	const isEmpty: boolean = Object.values(parsed).every(
		(fieldValue: number | null) => fieldValue === null,
	);

	return isEmpty ? null : parsed;
};
