import { isNil } from 'lodash';
import { extname } from 'path';

import AppEnum from '../../common/global/app.enum';
import GlobalEnum from './global-enum';

export const isValidEmail = (email: string): boolean => {
	const regexEmail: RegExp =
		/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return regexEmail.test(email);
};

export const makeRandomCode = (lengthCode: number = 6): string => {
	if (process.env.NODE_ENV === AppEnum.Environment.DEVELOPMENT) {
		return GlobalEnum.RandomCodeTest;
	}

	let result: string = '';

	const characters: string = `${process.env.CHARACTERS}`;

	const charactersLength: number = characters.length;

	for (let i = 0; i < lengthCode; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}

	return result.toUpperCase();
};

export const createUniqueSuffix = (length: number = 1e9): string =>
	`${Date.now()}${Math.round(Math.random() * length)}`;

/**
 * Removes every whitespace character (leading, trailing and in the middle).
 * Used to keep uniqName/username values free of spaces.
 */
export const removeSpaces = (value?: string | null): string =>
	`${value ?? ''}`.replace(/\s+/g, '');

export const createUsernameByEmail = (email: string): string => {
	const firstPartEmail: string = email.split('@')[0];
	const uniqueSuffix: string = createUniqueSuffix(10);
	return removeSpaces(`${firstPartEmail}${uniqueSuffix}`);
};

export const createUsernameByName = (name: string): string => {
	const uniqueSuffix: string = createUniqueSuffix(10);
	return removeSpaces(`${name}${uniqueSuffix}`);
};

export const createNameByEmail = (email: string): string => {
	const firstPartEmail: string = email.split('@')[0];
	return firstPartEmail;
};

export const newFileOriginalname = (fileOriginalname: string): string => {
	if (!fileOriginalname?.trim()) throw new Error('invalid fileOriginalname');

	const uniqueSuffix: string = createUniqueSuffix();

	const ext: string = extname(fileOriginalname);

	const name: string = fileOriginalname.split('.').slice(0, -1).join('.');

	const filename: string = `${name}-${uniqueSuffix}${ext}`;

	return filename;
};

export const valueOrCreateUniqueSuffix = (value: any): string => {
	if (isNil(value) || value?.trim() === '') {
		return createUniqueSuffix();
	}

	return value;
};
