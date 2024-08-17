import { extname } from 'path';

import AppEnum from '../../enums/app.enum';
import GlobalEnum from './global-enum';

export const isValidEmail = (email: string): boolean => {
	const regexEmail: RegExp =
		/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return regexEmail.test(email);
};

export const makeRandomCode = (lengthCode: number = 6): string => {
	if (process.env.ENVIRONMENT === AppEnum.Environment.DEVELOPMENT) {
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

export const createUsernameByEmail = (email: string): string => {
	const firstPartEmail: string = email.split('@')[0];
	const uniqueSuffix: string = createUniqueSuffix(10);
	return `${firstPartEmail}${uniqueSuffix}`;
};

export const createUsernameByName = (name: string): string => {
	const uniqueSuffix: string = createUniqueSuffix(10);
	return `${name}${uniqueSuffix}`;
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
