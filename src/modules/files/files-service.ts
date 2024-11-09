import * as AWS from 'aws-sdk';

// file: aws-s3 > src > app.service.ts
import { Injectable, Logger } from '@nestjs/common';

import { AmazonFilesService } from './amazon-files-service';
import { IFilesServiceFactory } from './interfaces/files-service-factory.interface';
import { LocalFilesService } from './local-files-service';

@Injectable()
export class FilesService {
	//#region Private properties

	private readonly _logger: Logger;

	private readonly _filesServiceFactory: IFilesServiceFactory;

	//#endregion

	//#region Constructor

	constructor() {
		this._logger = new Logger(FilesService.name);

		const useLocalFiles: boolean = Boolean(
			process.env?.USE_LOCAL_FILES === 'true',
		);

		if (useLocalFiles) {
			this._filesServiceFactory = new LocalFilesService();
		} else {
			this._filesServiceFactory = new AmazonFilesService();
		}
	}

	//#endregion

	//#region Public methods

	public async uploadFile(
		file: Express.Multer.File,
	): Promise<AWS.S3.ManagedUpload.SendData> {
		return this._filesServiceFactory.uploadFile(file);
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
		return this._filesServiceFactory.deleteFile(filename);
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

	public getFilenameByFilename(filename: string): string {
		return `${this._filesServiceFactory.filesFolderPath}${filename}`;
	}

	public async getFileBufferByFilename(
		filename: string,
	): Promise<Buffer | null> {
		return this._filesServiceFactory.getFileBufferByFilename(filename);
	}

	//#endregion
}
