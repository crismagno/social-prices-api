import { BadRequestException } from '@nestjs/common';

import DynamicFieldEnum from './dynamic-field.enum';
import { IDynamicField, TDynamicFieldValue } from './dynamic-field.interface';

const parseBoolean = (value: any): boolean => {
	if (typeof value === 'boolean') {
		return value;
	}

	return `${value ?? ''}`.trim().toLowerCase() === 'true';
};

const parseNumber = (
	name: string,
	value: any,
	type: DynamicFieldEnum.Type,
): number | null => {
	if (value === null || value === undefined || `${value}`.trim() === '') {
		return null;
	}

	const parsed: number = Number(value);

	if (Number.isNaN(parsed)) {
		throw new BadRequestException(
			`Dynamic field "${name}" expects a number value.`,
		);
	}

	return type === DynamicFieldEnum.Type.INT ? Math.trunc(parsed) : parsed;
};

const parseValue = (
	name: string,
	type: DynamicFieldEnum.Type,
	value: any,
): TDynamicFieldValue => {
	switch (type) {
		case DynamicFieldEnum.Type.BOOLEAN:
			return parseBoolean(value);
		case DynamicFieldEnum.Type.STRING:
			return value === null || value === undefined ? '' : `${value}`;
		case DynamicFieldEnum.Type.INT:
		case DynamicFieldEnum.Type.DECIMAL:
			return parseNumber(name, value, type);
		default:
			throw new BadRequestException(
				`Dynamic field "${name}" has an unsupported type.`,
			);
	}
};

/**
 * Normalizes the dynamic fields sent by the client before they are persisted.
 *
 * Entries without a name are dropped, names are trimmed and must be unique
 * (case-insensitively), and each value is coerced to its declared type.
 */
export const parseDynamicFields = (
	dynamicFields?: IDynamicField[] | string | null,
): IDynamicField[] => {
	if (!dynamicFields) {
		return [];
	}

	const items: IDynamicField[] =
		typeof dynamicFields === 'string'
			? JSON.parse(dynamicFields)
			: dynamicFields;

	if (!Array.isArray(items)) {
		throw new BadRequestException('Dynamic fields must be a list.');
	}

	const usedNames = new Set<string>();

	return items.reduce((accumulator: IDynamicField[], item: IDynamicField) => {
		const name: string = `${item?.name ?? ''}`.trim();

		if (!name) {
			return accumulator;
		}

		if (!Object.keys(DynamicFieldEnum.Type).includes(item?.type)) {
			throw new BadRequestException(
				`Dynamic field "${name}" has an unsupported type.`,
			);
		}

		const nameKey: string = name.toLowerCase();

		if (usedNames.has(nameKey)) {
			throw new BadRequestException(`Dynamic field "${name}" is duplicated.`);
		}

		usedNames.add(nameKey);

		accumulator.push({
			name,
			type: item.type,
			value: parseValue(name, item.type, item.value),
		});

		return accumulator;
	}, []);
};
