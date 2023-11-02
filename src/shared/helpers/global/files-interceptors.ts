import { diskStorage } from 'multer';
import { extname } from 'path';

export const fileInterceptorOptionsUploadAvatar = (destination: string) => ({
	storage: diskStorage({
		destination,
		filename: (req, file, callback) => {
			const uniqueSuffix: string = `${Date.now()}-${Math.round(
				Math.random() * 1e9,
			)}`;

			const ext: string = extname(file.originalname);

			const name: string = file.originalname.split('.').slice(0, -1).join('.');

			const filename: string = `${name}-${uniqueSuffix}${ext}`;

			callback(null, filename);
		},
	}),
});
