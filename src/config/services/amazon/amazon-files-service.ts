import * as AWS from 'aws-sdk';

// file: aws-s3 > src > app.service.ts
import { Injectable, Logger } from '@nestjs/common';

import { newFileOriginalname } from '../../../shared/helpers/global';

@Injectable()
export class AmazonFilesService {
	//#region Private properties

	private _awsS3Bucket: string = process.env.AWS_S3_BUCKET;
	private _awsS3: AWS.S3;
	private _logger: Logger;

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

		return await this._s3upload(
			buffer,
			this._awsS3Bucket,
			newFileOriginalname(originalname),
			mimetype,
		);
	}

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

	//#endregion
}
