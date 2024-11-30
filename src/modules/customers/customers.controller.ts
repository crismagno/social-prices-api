import { Response } from 'express';

import {
	Body,
	Controller,
	Get,
	InternalServerErrorException,
	Param,
	Post,
	Put,
	Res,
	UploadedFile,
	UploadedFiles,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import { parseFilePipeBuilder } from '../../shared/pipes/parse-file-builder-pipe';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { CustomersService } from './customers.service';
import { ICustomer } from './interfaces/customer.interface';
import { IFiltersDownloadCustomers } from './interfaces/customers.type';
import CreateCustomerDto from './interfaces/dto/createCustomer.dto';
import UpdateCustomerDto from './interfaces/dto/updateCustomer.dto';

@Controller('api/v1/customers')
export class CustomersController {
	constructor(private _customersService: CustomersService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FileInterceptor('avatar'))
	public async create(
		@UploadedFile(parseFilePipeBuilder({ build: { fileIsRequired: false } }))
		file: Express.Multer.File,
		@AuthPayload() authPayload: IAuthPayload,
		@Body() createCustomerDto: CreateCustomerDto,
	): Promise<ICustomer> {
		return await this._customersService.create(
			file,
			createCustomerDto,
			authPayload._id,
		);
	}

	@Put('/')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FileInterceptor('avatar'))
	public async update(
		@UploadedFile(parseFilePipeBuilder({ build: { fileIsRequired: false } }))
		file: Express.Multer.File,
		@AuthPayload() authPayload: IAuthPayload,
		@Body() updateCustomerDto: UpdateCustomerDto,
	): Promise<ICustomer> {
		return await this._customersService.update(
			file,
			updateCustomerDto,
			authPayload._id,
		);
	}

	@Get('/ownerUserId')
	@UsePipes(ValidationPipe)
	public async findByOwnerUserId(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<ICustomer[]> {
		return await this._customersService.findByOwnerUserId(authPayload._id);
	}

	@Post('/ownerUserTableState')
	@UsePipes(ValidationPipe)
	public async findByOwnerUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<ICustomer>,
	): Promise<ITableStateResponse<ICustomer[]>> {
		return await this._customersService.findByOwnerUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/ownerUser/count')
	@UsePipes(ValidationPipe)
	public async countByOwnerUserId(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<number> {
		return await this._customersService.countByOwnerUserId(authPayload._id);
	}

	@Get('/:customerId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('customerId', ValidationParamsPipe) customerId: string,
	): Promise<ICustomer | null> {
		return await this._customersService.findById(customerId);
	}

	@Post('/uploadCustomers')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FilesInterceptor('files'))
	public async uploadCustomers(
		@UploadedFiles(parseFilePipeBuilder())
		files: Express.Multer.File[],
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<void> {
		return await this._customersService.uploadCustomers(
			files,
			authPayload._id,
			authPayload.employeeId,
		);
	}

	@Post('/downloadCustomers')
	@UsePipes(ValidationPipe)
	public async downloadErrors(
		@Res() res: Response,
		@AuthPayload() authPayload: IAuthPayload,
		@Body() filters: IFiltersDownloadCustomers,
	): Promise<any> {
		const buffer: Buffer = await this._customersService.downloadCustomers(
			authPayload._id,
			filters,
		);

		if (!buffer) {
			throw new InternalServerErrorException(
				'Error when attempt download customers',
			);
		}

		res.set({
			'Content-Disposition': `attachment; filename=fileDownloadCustomers.xlsx`,
		});

		res.send(buffer);
	}
}
