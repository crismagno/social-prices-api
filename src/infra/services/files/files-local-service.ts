import * as AWS from 'aws-sdk';

// file: aws-s3 > src > app.service.ts
import { Injectable, Logger } from '@nestjs/common';

import { newFileOriginalname } from '../../../shared/utils/global';
import { IFilesServiceFactory } from './files-service-factory.interface';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

@Injectable()
export class FilesLocalService implements IFilesServiceFactory {
	//#region Private properties

	private readonly _logger: Logger;
	private readonly _localFolderPath: any = path.join(
		process.cwd(),
		'/uploads/',
	);

	//#endregion

	//#region Constructor

	constructor() {
		this._logger = new Logger(FilesLocalService.name);
	}

	//#endregion

	//#region Public methods

	public async uploadFile(
		file: Express.Multer.File,
	): Promise<AWS.S3.ManagedUpload.SendData> {
		return new Promise((resolve, reject) => {
			const filename: string = newFileOriginalname(file.originalname);

			const filePath: string = `${this._localFolderPath}${filename}`;

			fs.writeFile(filePath, file.buffer, (err: any) => {
				if (err) {
					this._logger.error('Error saving file:', err);
					reject(err);
					return;
				}

				this._logger.log('File saved successfully');

				resolve({
					Bucket: 'uploads',
					ETag: '',
					Key: filename,
					Location: this._localFolderPath,
				});
			});
		});
	}

	public async deleteFile(filename: string): Promise<any> {
		if (!filename) return null;

		return new Promise((resolve) => {
			const filePath: string = `${this._localFolderPath}${filename}`;

			fs.unlink(filePath, (err: any) => {
				if (err) {
					this._logger.error('Error removing file:', err);
					resolve(err);
					return;
				}

				this._logger.log('File successfully removed');
				resolve(true);
			});
		});
	}

	//#endregion
}
