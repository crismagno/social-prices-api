import * as AWS from 'aws-sdk';

// file: aws-s3 > src > app.service.ts
import { Injectable, Logger } from '@nestjs/common';

import { newFileOriginalname } from '../../../shared/utils/global';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

@Injectable()
export class AmazonFilesService {
	//#region Private properties

	private _awsS3Bucket: string = process.env.AWS_S3_BUCKET;
	private _awsS3: AWS.S3;
	private _logger: Logger;
	private _localFolderPath: any = path.join(process.cwd(), '/uploads/');

	//#endregion

	//#region Constructor

	constructor() {
		this._awsS3 = new AWS.S3({
			accessKeyId: process.env.ACCESS_KEY_ID,
			secretAccessKey: process.env.SECRET_ACCESS_KEY,
			region: process.env.AWS_S3_REGION,
		});

		this._logger = new Logger(AmazonFilesService.name);
	}

	//#endregion

	//#region Public methods

	public async uploadFile(
		file: Express.Multer.File,
	): Promise<AWS.S3.ManagedUpload.SendData> {
		const useLocalFiles: boolean = Boolean(
			process.env?.USE_LOCAL_FILES === 'true',
		);

		if (useLocalFiles) {
			return await this._localUpload(file);
		}

		const { originalname, buffer, mimetype } = file;

		return await this._s3upload(
			buffer,
			this._awsS3Bucket,
			newFileOriginalname(originalname),
			mimetype,
		);
	}

	public async uploadFiles(
		files: Express.Multer.File[],
	): Promise<AWS.S3.ManagedUpload.SendData[]> {
		const result: AWS.S3.ManagedUpload.SendData[] = [];

		for await (const file of files) {
			const responseUploadFile: AWS.S3.ManagedUpload.SendData =
				await this.uploadFile(file);
			result.push(responseUploadFile);
		}

		return result;
	}

	public async getUploadFilesUrl(
		files: Express.Multer.File[],
	): Promise<string[]> {
		if (!files?.length) {
			return [];
		}

		const result: AWS.S3.ManagedUpload.SendData[] =
			await this.uploadFiles(files);

		return result.map(
			(responseFile: AWS.S3.ManagedUpload.SendData) => responseFile.Key,
		);
	}

	public async deleteFile(filename: string): Promise<any> {
		if (!filename) return null;

		const useLocalFiles: boolean = Boolean(
			process.env?.USE_LOCAL_FILES === 'true',
		);

		if (useLocalFiles) {
			return await this._localDelete(filename);
		}

		return await this._s3delete(this._awsS3Bucket, filename);
	}

	public async deleteFiles(
		filenames: string[],
	): Promise<AWS.S3.DeleteObjectOutput[]> {
		const result: AWS.S3.DeleteObjectOutput[] = [];

		for await (const filename of filenames) {
			const responseDeleteFile: AWS.S3.DeleteObjectOutput =
				await this.deleteFile(filename);
			result.push(responseDeleteFile);
		}

		return result;
	}

	//#endregion

	//#region Private methods

	private async _s3upload(
		buffer: any,
		bucket: any,
		filename: any,
		mimetype: any,
	): Promise<AWS.S3.ManagedUpload.SendData> {
		const params = {
			Bucket: bucket,
			Key: filename,
			Body: buffer,
			ACL: 'public-read',
			ContentType: mimetype,
			ContentDisposition: 'inline',
		};

		try {
			const s3Response: AWS.S3.ManagedUpload.SendData = await this._awsS3
				.upload(params)
				.promise();

			return s3Response;
		} catch (error: any) {
			this._logger.error(error);
			throw error;
		}
	}

	private async _s3delete(
		bucket: any,
		filename: any,
	): Promise<AWS.S3.DeleteObjectOutput> {
		return new Promise((resolve, reject) => {
			const params = {
				Bucket: bucket,
				Key: filename,
			};

			try {
				this._awsS3.deleteObject(
					params,
					(error: AWS.AWSError, data: AWS.S3.DeleteObjectOutput) => {
						if (error) {
							this._logger.error('Error deleting file:', error);
							reject(error);
						} else {
							resolve(data);
						}
					},
				);
			} catch (error: any) {
				this._logger.error(error);
				reject(error);
			}
		});
	}

	private async _localUpload(
		file: Express.Multer.File,
	): Promise<AWS.S3.ManagedUpload.SendData> {
		return new Promise((resolve, reject) => {
			const filename: string = newFileOriginalname(file.originalname);

			const filePath: string = `${this._localFolderPath}${filename}`;

			fs.writeFile(filePath, file.buffer, (err) => {
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

	private async _localDelete(filename: string): Promise<any> {
		return new Promise((resolve) => {
			const filePath: string = `${this._localFolderPath}${filename}`;

			fs.unlink(filePath, (err) => {
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

	//#region Unused

	public async getFileObject(key: string): Promise<string | undefined> {
		const data = await this._awsS3
			.getObject({
				Bucket: this._awsS3Bucket,
				Key: key,
			})
			.promise();

		if (data.Body) {
			return data.Body.toString('utf-8');
		}

		return undefined;
	}

	//#endregion
}
