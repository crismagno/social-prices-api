import * as ExcelJS from 'exceljs';
import { reduce } from 'lodash';
import { FilterQuery, Model, QueryOptions, UpdateQuery } from 'mongoose';

import {
	Injectable,
	InternalServerErrorException,
	Logger,
	NotFoundException,
} from '@nestjs/common';
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
import {
	IFileUploadTemplateError,
	IFileUploadTemplateRowErrorReason,
} from './interfaces/files-uploads.type';

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

	public async findByIdOrFail(fileUploadId: string): Promise<IFileUpload> {
		const fileUpload: IFileUpload | undefined =
			await this.findById(fileUploadId);

		if (!fileUpload) {
			throw new NotFoundException('File Upload not found!');
		}

		return fileUpload;
	}

	public async findByUserId(userId: string): Promise<IFileUpload[]> {
		return this._fileUploadModel.find({
			userId,
		});
	}

	public async hasUploadProcessingByUserIdAndType(
		userId: string,
		type: FilesUploadsEnum.Type,
	): Promise<boolean> {
		const count: number = await this._fileUploadModel.count({
			userId,
			status: {
				$in: [
					FilesUploadsEnum.Status.PENDING,
					FilesUploadsEnum.Status.PROCESSING,
				],
			},
			type,
		});

		return count > 0;
	}

	public async hasUploadCustomersProcessingByUserId(
		userId: string,
	): Promise<boolean> {
		return await this.hasUploadProcessingByUserIdAndType(
			userId,
			FilesUploadsEnum.Type.UPLOAD_CUSTOMERS,
		);
	}

	public async hasUploadProductsProcessingByUserId(
		userId: string,
	): Promise<boolean> {
		return await this.hasUploadProcessingByUserIdAndType(
			userId,
			FilesUploadsEnum.Type.UPLOAD_PRODUCTS,
		);
	}

	public async hasUploadEmployeesProcessingByUserId(
		userId: string,
	): Promise<boolean> {
		return await this.hasUploadProcessingByUserIdAndType(
			userId,
			FilesUploadsEnum.Type.UPLOAD_EMPLOYEES,
		);
	}

	public async hasUploadSalesProcessingByUserId(
		userId: string,
	): Promise<boolean> {
		return await this.hasUploadProcessingByUserIdAndType(
			userId,
			FilesUploadsEnum.Type.UPLOAD_SALES,
		);
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
			{ errors: 0 },
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

	public async downloadErrors(fileUploadId: string): Promise<Buffer> {
		const fileUpload: IFileUpload = await this.findByIdOrFail(fileUploadId);

		if (!fileUpload.errors) {
			throw new InternalServerErrorException('There are no errors to download');
		}

		const workbook: ExcelJS.Workbook = new ExcelJS.Workbook();
		const worksheet: ExcelJS.Worksheet = workbook.addWorksheet('Errors');

		const fileUploadErrors: IFileUploadTemplateError<any> = fileUpload.errors;

		const sheetColumns: any[] = [];

		if (fileUploadErrors.rowsError.length) {
			for (const fileColumnKey in fileUploadErrors.fileColumns) {
				sheetColumns.push({
					header: fileUploadErrors.fileColumns[fileColumnKey],
					key: fileColumnKey,
					width: fileColumnKey === 'rowNumber' ? 10 : 30,
				});
			}

			worksheet.columns = sheetColumns;

			for (const rowError of fileUploadErrors.rowsError) {
				const rowErrorReasonsObj = reduce(
					rowError.reasons,
					(acc, rowErrorReason: IFileUploadTemplateRowErrorReason<any>) => {
						acc[rowErrorReason.property] = rowErrorReason.message;
						return acc;
					},
					{ rowNumber: rowError.rowNumber },
				);

				worksheet.addRow(rowErrorReasonsObj);
			}
		} else {
			sheetColumns.push({
				header: 'Other',
				key: 'other',
				width: 30,
			});

			worksheet.columns = sheetColumns;

			worksheet.addRow({ other: fileUploadErrors.processError });
		}

		const buffer = await workbook.xlsx.writeBuffer();
		return buffer as Buffer;
	}

	// #endregion
}
