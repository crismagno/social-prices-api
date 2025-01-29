import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Put,
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
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { EmployeesService } from './employees.service';
import CreateEmployeeDto from './interfaces/dto/createEmployee.dto';
import UpdateEmployeeDto from './interfaces/dto/updateEmployee.dto';
import { IEmployee } from './interfaces/employee.interface';

@Controller('api/v1/employees')
export class EmployeesController {
	constructor(private _employeesService: EmployeesService) {}

	@Post('/')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FileInterceptor('avatar'))
	public async create(
		@UploadedFile(parseFilePipeBuilder({ build: { fileIsRequired: false } }))
		file: Express.Multer.File,
		@Body() createEmployeeDto: CreateEmployeeDto,
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IEmployee> {
		return await this._employeesService.create(
			file,
			createEmployeeDto,
			authPayload._id,
		);
	}

	@Put('/')
	@UsePipes(ValidationPipe)
	@UseInterceptors(FileInterceptor('avatar'))
	public async update(
		@UploadedFile(parseFilePipeBuilder({ build: { fileIsRequired: false } }))
		file: Express.Multer.File,
		@Body() updateEmployeeDto: UpdateEmployeeDto,
	): Promise<IEmployee> {
		return await this._employeesService.update(file, updateEmployeeDto);
	}

	@Get('/user')
	@UsePipes(ValidationPipe)
	public async findByUserId(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IEmployee[]> {
		return await this._employeesService.findByUserId(authPayload._id);
	}

	@Post('/userTableState')
	@UsePipes(ValidationPipe)
	public async findByOwnerUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<IEmployee>,
	): Promise<ITableStateResponse<IEmployee[]>> {
		return await this._employeesService.findByUserTableState(
			authPayload._id,
			authPayload.employeeId,
			tableState,
		);
	}

	@Get('/user/count')
	@UsePipes(ValidationPipe)
	public async countByUserId(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<number> {
		return await this._employeesService.countByUserId(authPayload._id);
	}

	@Get('/:employeeId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('employeeId', ValidationParamsPipe) employeeId: string,
	): Promise<IEmployee | null> {
		return await this._employeesService.findById(employeeId);
	}
}
