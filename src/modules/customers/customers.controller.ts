import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Put,
	Request,
	UploadedFile,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { parseFilePipeBuilder } from '../../shared/pipes/parse-file-builder-pipe';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import AuthEnum from '../auth/interfaces/auth.enum';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { CustomersService } from './customers.service';
import { ICustomer } from './interfaces/customer.interface';
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
		@UploadedFile(parseFilePipeBuilder({ build: { fileIsRequired: false } }))
		file: Express.Multer.File,
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

	@Get('/ownerUserId')
	@UsePipes(ValidationPipe)
	public async findByOwnerUserId(
		@Request() request: any,
	): Promise<ICustomer[]> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._customersService.findByOwnerUserId(authPayload._id);
	}

	@Post('/ownerUserTableState')
	@UsePipes(ValidationPipe)
	public async findByOwnerUserTableState(
		@Request() request: any,
		@Body() tableState: ITableStateRequest<ICustomer>,
	): Promise<ITableStateResponse<ICustomer[]>> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._customersService.findByOwnerUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/ownerUser/count')
	@UsePipes(ValidationPipe)
	public async countByOwnerUserId(@Request() request: any): Promise<number> {
		const authPayload: IAuthPayload =
			request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		return await this._customersService.countByOwnerUserId(authPayload._id);
	}

	@Get('/:customerId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('customerId', ValidationParamsPipe) customerId: string,
	): Promise<ICustomer> {
		return await this._customersService.findById(customerId);
	}
}
