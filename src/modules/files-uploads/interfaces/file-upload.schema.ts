import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { IFileUpload } from './file-upload.interface';
import FilesUploadsEnum from './files-uploads.enum';

@Schema()
export class FileUpload implements IFileUpload {
	readonly _id: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	userId: mongoose.Schema.Types.ObjectId;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	employeeId: mongoose.Schema.Types.ObjectId;

	@Prop({ type: String, required: true })
	filename: string | null;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(FilesUploadsEnum.Type),
			message: '{VALUE} is not supported',
		},
	})
	type: FilesUploadsEnum.Type;

	@Prop({
		required: true,
		type: String,
		enum: {
			values: Object.keys(FilesUploadsEnum.Status),
			message: '{VALUE} is not supported',
		},
	})
	status: FilesUploadsEnum.Status;

	@Prop({ type: Number })
	totalToProcess: number | null;

	@Prop({ type: Number })
	totalProcessed: number | null;

	@Prop({ type: Number })
	totalSuccess: number | null;

	@Prop({ type: Number })
	totalError: number | null;

	@Prop({ type: mongoose.Schema.Types.Mixed })
	errors: any | null;

	@Prop({ type: mongoose.Schema.Types.Mixed })
	extra: any | null;

	@Prop({ required: true, type: Date })
	createdAt: Date;

	@Prop({ required: true, type: Date })
	updatedAt: Date;
}

export const FileUploadSchema = SchemaFactory.createForClass(FileUpload);
