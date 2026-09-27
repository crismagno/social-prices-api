import {
	Body,
	Controller,
	Delete,
	Param,
	Post,
	Put,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import CreateTransactionDto from './interfaces/dto/createTransaction.dto';
import UpdateTransactionDto from './interfaces/dto/updateTransaction.dto';
import { ITransaction } from './interfaces/transaction.interface';
import {
	ITransactionSummary,
	ITransactionSummaryRequest,
} from './interfaces/transactions.types';
import { ITransactionActor, TransactionsService } from './transactions.service';

const toActor = (authPayload: IAuthPayload): ITransactionActor => ({
	_id: authPayload._id,
	employeeId: authPayload.employeeId,
});

@Controller('api/v1/transactions')
export class TransactionsController {
	constructor(private readonly _transactionsService: TransactionsService) {}

	@Post()
	@UsePipes(ValidationPipe)
	public async create(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() createTransactionDto: CreateTransactionDto,
	): Promise<ITransaction> {
		return await this._transactionsService.create(
			toActor(authPayload),
			createTransactionDto,
		);
	}

	@Post('/userTableState')
	public async findByUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<ITransaction>,
	): Promise<ITableStateResponse<ITransaction[]>> {
		return await this._transactionsService.findByUserTableState(
			toActor(authPayload),
			tableState,
		);
	}

	@Post('/summary')
	public async summary(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() request: ITransactionSummaryRequest,
	): Promise<ITransactionSummary> {
		return await this._transactionsService.summary(
			toActor(authPayload),
			request,
		);
	}

	@Put('/:id')
	@UsePipes(ValidationPipe)
	public async update(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('id') id: string,
		@Body() updateTransactionDto: UpdateTransactionDto,
	): Promise<ITransaction> {
		return await this._transactionsService.update(
			toActor(authPayload),
			id,
			updateTransactionDto,
		);
	}

	@Delete('/:id')
	public async remove(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('id') id: string,
	): Promise<void> {
		await this._transactionsService.remove(toActor(authPayload), id);
	}
}
