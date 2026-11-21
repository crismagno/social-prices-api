import * as AWS from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';

// file: aws-s3 > src > app.service.ts
import { Injectable, Logger } from '@nestjs/common';

import { newFileOriginalname } from '../../shared/utils/global/global';
import { IFilesServiceFactory } from './interfaces/files-service-factory.interface';

@Injectable()
export class AmazonFilesService implements IFilesServiceFactory {
	//#region Private properties

	private readonly _awsS3Bucket: string = process.env.AWS_S3_BUCKET;
	private readonly _folder: string;
	private readonly _isPublic: boolean;
	private readonly _awsS3: AWS.S3;
	private readonly _logger: Logger;

	//#endregion

	//#region Public  properties

	public readonly filesFolderPath: string =
		process.env.BUCKET_SOCIAL_PRICES_AWS_S3;

	//#endregion

	//#region Constructor

	/**
	 * By default the root of the bucket, with files anyone holding the address
	 * can read. A folder of the same bucket (`chat/`) keeps other files apart,
	 * and they can be private: read only through this service. File names given
	 * to and by this class never carry the folder.
	 */
	constructor(options: { folder?: string; isPublic?: boolean } = {}) {
		this._folder = options.folder ?? '';
		this._isPublic = options.isPublic ?? true;

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
		const { originalname, buffer, mimetype } = file;

		const filename: string = newFileOriginalname(originalname);

		const response: AWS.S3.ManagedUpload.SendData = await this._s3upload(
			buffer,
			this._awsS3Bucket,
			this._keyOf(filename),
			mimetype,
		);

		// The name without the folder, as it is asked for later.
		return { ...response, Key: filename };
	}

	public async deleteFile(filename: string): Promise<any | null> {
		if (!filename) return null;

		return this._s3delete(this._awsS3Bucket, this._keyOf(filename));
	}

	public async getFileBufferByFilename(
		filename: string,
	): Promise<Buffer | null> {
		if (!filename) return null;

		const data: PromiseResult<AWS.S3.GetObjectOutput, AWS.AWSError> =
			await this._awsS3
				.getObject({
					Bucket: this._awsS3Bucket,
					Key: this._keyOf(filename),
				})
				.promise();

		return data.Body as Buffer;
	}

	//#endregion

	//#region Private methods

	/** Where the file is in the bucket: inside this service's folder, if it has one. */
	private _keyOf(filename: string): string {
		return `${this._folder}${filename}`;
	}

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
			...(this._isPublic ? { ACL: 'public-read' } : {}),
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

	//#endregion
}
