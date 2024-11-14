import { FilterQuery, Model, QueryOptions, UpdateQuery } from 'mongoose';

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import CreateFileUploadDto from './interfaces/dto/createFileUpload.dto';
import { IFileUpload } from './interfaces/file-upload.interface';
import { FileUpload } from './interfaces/file-upload.schema';
import FilesUploadsEnum from './interfaces/files-uploads.enum';

@Injectable()
export class FilesUploadsService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.fileUpload)
		private readonly _fileUploadModel: Model<FileUpload>,
	) {
		this._logger = new Logger(FilesUploadsService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(fileUploadId: string): Promise<IFileUpload | null> {
		return this._fileUploadModel.findById(fileUploadId);
	}

	public async findByUserId(userId: string): Promise<IFileUpload[]> {
		return this._fileUploadModel.find({
			userId,
		});
	}

	public async hasUploadCustomersProcessingByUserId(
		userId: string,
	): Promise<boolean> {
		const count: number = await this._fileUploadModel.count({
			userId,
			status: {
				$in: [
					FilesUploadsEnum.Status.PENDING,
					FilesUploadsEnum.Status.PROCESSING,
				],
			},
			type: FilesUploadsEnum.Type.UPLOAD_CUSTOMERS,
		});

		return count > 0;
	}

	public async findByIds(fileUploadIds: string[]): Promise<IFileUpload[]> {
		return this._fileUploadModel.find({
			_id: { $in: fileUploadIds },
		});
	}

	public async findByUserTableState(
		userId: string,
		tableState: ITableStateRequest<IFileUpload>,
	): Promise<ITableStateResponse<IFileUpload[]>> {
		const filter: FilterQuery<IFileUpload> = {
			userId,
		};

		if (tableState.search) {
			filter.filename = new RegExp(tableState.search, 'ig');
		}

		if (tableState?.filters?.type?.length) {
			filter.type = { $in: tableState.filters.type };
		}

		if (tableState?.filters?.status?.length) {
			filter.status = { $in: tableState.filters.status };
		}

		const response: ITableStateResponse<IFileUpload[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._fileUploadModel.countDocuments(filter);
		response.data = await this._fileUploadModel.find(
			filter,
			null,
			queryOptions<IFileUpload>(tableState),
		);

		return response;
	}

	public async createMulti(
		createFileUploadDto: CreateFileUploadDto,
	): Promise<IFileUpload[]> {
		const now: Date = new Date();

		const filesUploadsCreated: IFileUpload[] = [];

		for await (const filename of createFileUploadDto.filenames) {
			const fileUpload = new this._fileUploadModel({
				createdAt: now,
				updatedAt: now,
				employeeId: createFileUploadDto.employeeId,
				filename,
				status: FilesUploadsEnum.Status.PENDING,
				type: createFileUploadDto.type,
				userId: createFileUploadDto.userId,
				errors: null,
				extra: null,
				totalError: 0,
				totalProcessed: 0,
				totalSuccess: 0,
				totalToProcess: 0,
			});

			const fileUploadCreated: IFileUpload = await fileUpload.save();

			filesUploadsCreated.push(fileUploadCreated);
		}

		return filesUploadsCreated;
	}

	public async findByIdAndUpdate(
		fileUploadId: string,
		update?: UpdateQuery<FileUpload>,
		options?: QueryOptions<FileUpload>,
	): Promise<IFileUpload> {
		return await this._fileUploadModel.findByIdAndUpdate(
			fileUploadId,
			update,
			options,
		);
	}

	// #endregion
}
