import { randomUUID } from 'crypto';
import { extname } from 'path';

import { Injectable, Logger } from '@nestjs/common';

import { AmazonFilesService } from './amazon-files-service';
import { IFilesServiceFactory } from './interfaces/files-service-factory.interface';
import { LocalFilesService } from './local-files-service';

/** The folder of the bucket the chat's files go in. */
export const CHAT_FILES_FOLDER: string = 'chat/';

/** The same, on this machine, when files are kept locally. */
export const CHAT_FILES_LOCAL_FOLDER: string = '/uploads/chat/';

export interface IChatFile {
	buffer: Buffer;
	fileName: string;
	mimeType: string;
}

/**
 * The files people send each other in the platform's chat. They live apart
 * from everything else (logos, product pictures): the same bucket, in a folder
 * of their own (`chat/`), or their own folder when files are kept locally. And
 * they are private: never a public address, only read back through here by
 * whoever is in the conversation.
 */
@Injectable()
export class ChatFilesService {
	//#region Private properties

	private readonly _logger: Logger = new Logger(ChatFilesService.name);

	private readonly _storage: IFilesServiceFactory;

	//#endregion

	//#region Constructor

	constructor() {
		const useLocalFiles: boolean = process.env?.USE_LOCAL_FILES === 'true';

		this._storage = useLocalFiles
			? new LocalFilesService(CHAT_FILES_LOCAL_FOLDER)
			: new AmazonFilesService({ folder: CHAT_FILES_FOLDER, isPublic: false });
	}

	//#endregion

	//#region Public methods

	/** Stores the file and gives back the key it is read with later. */
	public async save(file: IChatFile): Promise<string> {
		// The name people gave the file stays in the message; storage gets one of
		// its own, so nothing a person typed ends up in a path.
		const stored = await this._storage.uploadFile({
			originalname: `${randomUUID()}${this._extensionOf(file.fileName)}`,
			buffer: file.buffer,
			mimetype: file.mimeType,
		} as Express.Multer.File);

		return stored.Key;
	}

	public async read(key: string): Promise<Buffer | null> {
		if (!this._isKey(key)) {
			return null;
		}

		return await this._storage.getFileBufferByFilename(key);
	}

	/** Best effort: a file that could not be removed must not fail what asked for it. */
	public async remove(key: string): Promise<void> {
		if (!this._isKey(key)) {
			return;
		}

		try {
			await this._storage.deleteFile(key);
		} catch (error) {
			this._logger.warn(`Could not remove a chat file: ${String(error)}`);
		}
	}

	//#endregion

	//#region Private methods

	/** A short, plain extension, or none: `.pdf`, never a path. */
	private _extensionOf(fileName: string): string {
		const extension: string = extname(fileName ?? '').toLowerCase();

		return /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : '';
	}

	/** A key as this service makes them: a file name, never a way out of the folder. */
	private _isKey(key: string): boolean {
		return typeof key === 'string' && /^[\w.-]+$/.test(key) && key !== '..';
	}

	//#endregion
}
