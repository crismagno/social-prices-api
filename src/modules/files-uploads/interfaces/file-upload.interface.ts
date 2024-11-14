import mongoose from 'mongoose';

import { ICreatedAtEntity } from '../../../shared/interfaces/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/interfaces/updated-at.interface';
import FilesUploadsEnum from './files-uploads.enum';

export interface IFileUpload extends ICreatedAtEntity, IUpdatedAtEntity {
	readonly _id: string;
	userId: mongoose.Schema.Types.ObjectId;
	employeeId: mongoose.Schema.Types.ObjectId;
	filename: string;
	type: FilesUploadsEnum.Type;
	status: FilesUploadsEnum.Status;
	totalToProcess: number | null;
	totalProcessed: number | null;
	totalSuccess: number | null;
	totalError: number | null;
	errors: any | null;
	extra: any | null;
}
