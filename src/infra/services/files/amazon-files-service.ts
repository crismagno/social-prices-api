import * as AWS from 'aws-sdk';

// file: aws-s3 > src > app.service.ts
import { Injectable, Logger } from '@nestjs/common';

import { newFileOriginalname } from '../../../shared/utils/global';
import { IFilesServiceFactory } from './files-service-factory.interface';

@Injectable()
export class AmazonFilesService implements IFilesServiceFactory {
	//#region Private properties

	private readonly _awsS3Bucket: string = process.env.AWS_S3_BUCKET;
	private readonly _awsS3: AWS.S3;
	private readonly _logger: Logger;

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
		const { originalname, buffer, mimetype } = file;

		return this._s3upload(
			buffer,
			this._awsS3Bucket,
			newFileOriginalname(originalname),
			mimetype,
		);
	}

	public async deleteFile(filename: string): Promise<any> {
		if (!filename) return null;

		return this._s3delete(this._awsS3Bucket, filename);
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

	//#endregion
}
