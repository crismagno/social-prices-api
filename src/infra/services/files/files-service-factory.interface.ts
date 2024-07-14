export interface IFilesServiceFactory {
	uploadFile: (
		file: Express.Multer.File,
	) => Promise<AWS.S3.ManagedUpload.SendData>;

	deleteFile: (filename: string) => Promise<any>;
}
