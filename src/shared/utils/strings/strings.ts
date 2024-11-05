import { map } from 'lodash';
import { Types } from 'mongoose';

export const arrayStringToObjectId = (values: string[]): Types.ObjectId[] =>
	map(values, (value: string) => new Types.ObjectId(value));

export const arrayObjectIdToString = (values: Types.ObjectId[]): string[] =>
	map(values, (value: Types.ObjectId) => value.toString());
