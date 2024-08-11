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
	): Promise<IEmployee> {
		return await this._employeesService.create(file, createEmployeeDto);
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

	@Get('/user/:userId')
	@UsePipes(ValidationPipe)
	public async findByUserId(
		@Param('userId', ValidationParamsPipe) userId: string,
	): Promise<IEmployee[]> {
		return await this._employeesService.findByUserId(userId);
	}

	@Post('/userTableState/user/:userId')
	@UsePipes(ValidationPipe)
	public async findByOwnerUserTableState(
		@Param('userId', ValidationParamsPipe) userId: string,
		@Body() tableState: ITableStateRequest<IEmployee>,
	): Promise<ITableStateResponse<IEmployee[]>> {
		return await this._employeesService.findByUserTableState(
			userId,
			tableState,
		);
	}

	@Get('/count/user/:userId')
	@UsePipes(ValidationPipe)
	public async countByUserId(
		@Param('userId', ValidationParamsPipe) userId: string,
	): Promise<number> {
		return await this._employeesService.countByUserId(userId);
	}

	@Get('/:employeeId')
	@UsePipes(ValidationPipe)
	public async findById(
		@Param('employeeId', ValidationParamsPipe) employeeId: string,
	): Promise<IEmployee | null> {
		return await this._employeesService.findById(employeeId);
	}
}
