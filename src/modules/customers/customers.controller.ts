import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Put,
	Request,
	UploadedFiles,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/helpers/table/table-state.interface';
import { parseFilePipeBuilder } from '../../shared/pipes/parse-file-builder-pipe';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { CustomersService } from './customers.service';
import { ICustomer } from './interfaces/customer.interface';
import CreateCustomerDto from './interfaces/dto/createCustomer.dto';
import UpdateCustomerDto from './interfaces/dto/updateCustomer.dto';

@Controller('api/v1/products')
export class CustomersController {
	constructor(private _customersService: CustomersService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FileInterceptor('avatar'))
	public async create(
		@UploadedFiles(parseFilePipeBuilder({ build: { fileIsRequired: false } }))
		file: Express.Multer.File | null,
		@Request() request: any,
		@Body() createCustomerDto: CreateCustomerDto,
	): Promise<ICustomer> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

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
		@UploadedFiles(parseFilePipeBuilder({ build: { fileIsRequired: false } }))
		file: Express.Multer.File | null,
		@Request() request: any,
		@Body() updateCustomerDto: UpdateCustomerDto,
	): Promise<ICustomer> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._customersService.update(
			file,
			updateCustomerDto,
			authPayload._id,
		);
	}

	@Get('/ownerOfUserId')
	@UsePipes(ValidationPipe)
	public async findByOwnerOfUserId(
		@Request() request: any,
	): Promise<ICustomer[]> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._customersService.findByOwnerOfUserId(authPayload._id);
	}

	@Post('/ownerOfUserTableState')
	@UsePipes(ValidationPipe)
	public async findByOwnerOfUserTableState(
		@Request() request: any,
		@Body() tableState: ITableStateRequest<ICustomer>,
	): Promise<ITableStateResponse<ICustomer[]>> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._customersService.findByOwnerOfUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/:customerId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('customerId', ValidationParamsPipe) customerId: string,
	): Promise<ICustomer> {
		return await this._customersService.findById(customerId);
	}
}
