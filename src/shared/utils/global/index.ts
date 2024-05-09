import { extname } from 'path';

export const isValidEmail = (email: string): boolean => {
	const regexEmail: RegExp =
		/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return regexEmail.test(email);
};

export const makeRandomCode = (lengthCode: number = 6): string => {
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

export const newFileOriginalname = (fileOriginalname: string): string => {
	const uniqueSuffix: string = createUniqueSuffix();

	const ext: string = extname(fileOriginalname);

	const name: string = fileOriginalname.split('.').slice(0, -1).join('.');

	const filename: string = `${name}-${uniqueSuffix}${ext}`;

	return filename;
};

export const getFormattedFilename = (file: Express.Multer.File): string => {
	const uniqueSuffix: string = createUniqueSuffix();

	const ext: string = extname(file.originalname);

	const name: string = file.originalname.split('.').slice(0, -1).join('.');

	const filename: string = `${name}-${uniqueSuffix}${ext}`;

	return filename;
};
