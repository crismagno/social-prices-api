import multer, { diskStorage } from 'multer';
import { extname } from 'path';

import { createUniqueSuffix } from './';

export const fileInterceptorOptionsUploadAvatar = (
	destination: string,
): {
	storage: multer.StorageEngine;
} => ({
	storage: diskStorage({
		destination,
		filename: (req, file, callback) => {
			const uniqueSuffix: string = createUniqueSuffix();

			const ext: string = extname(file.originalname);

			const name: string = file.originalname.split('.').slice(0, -1).join('.');

			const filename: string = `${name}-${uniqueSuffix}${ext}`;

			callback(null, filename);
		},
	}),
});
