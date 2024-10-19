import * as AWS from 'aws-sdk';

// file: aws-s3 > src > app.service.ts
import { Injectable, Logger } from '@nestjs/common';

import { newFileOriginalname } from '../../../shared/utils/global/global';
import { IFilesServiceFactory } from './files-service-factory.interface';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

@Injectable()
export class LocalFilesService implements IFilesServiceFactory {
	//#region Private properties

	private readonly _logger: Logger;

	//#endregion

	//#region Public properties

	public readonly filesFolderPath: any = path.join(process.cwd(), '/uploads/');

	//#endregion

	//#region Constructor

	constructor() {
		this._logger = new Logger(LocalFilesService.name);
	}

	//#endregion

	//#region Public methods

	public async uploadFile(
		file: Express.Multer.File,
	): Promise<AWS.S3.ManagedUpload.SendData> {
		return new Promise((resolve, reject) => {
			const filename: string = newFileOriginalname(file.originalname);

			const filePath: string = `${this.filesFolderPath}${filename}`;

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
					Location: this.filesFolderPath,
				});
			});
		});
	}

	public async deleteFile(filename: string): Promise<any | null> {
		if (!filename) return null;

		return new Promise((resolve) => {
			const filePath: string = `${this.filesFolderPath}${filename}`;

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

	public async getFileBufferByFilename(
		filename: string,
	): Promise<Buffer | null> {
		if (!filename) return null;

		const filePath: string = `${this.filesFolderPath}${filename}`;

		return new Promise((resolve) => {
			fs.readFile(filePath, (err: any, data: Buffer) => {
				if (err) {
					this._logger.error('Error when attempt to read file:', err);
					resolve(null);
					return;
				}

				this._logger.log('File successfully read!');
				resolve(data);
			});
		});
	}

	//#endregion
}
