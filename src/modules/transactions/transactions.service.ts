import { FilterQuery, Model, Types } from 'mongoose';

import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { EmployeesService } from '../employees/employees.service';
import EmployeesEnum from '../employees/interfaces/employees.enum';
import CreateTransactionDto from './interfaces/dto/createTransaction.dto';
import UpdateTransactionDto from './interfaces/dto/updateTransaction.dto';
import { ITransaction } from './interfaces/transaction.interface';
import { Transaction } from './interfaces/transaction.schema';
import TransactionsEnum from './interfaces/transactions.enum';
import {
	ITransactionSummary,
	ITransactionSummaryRequest,
} from './interfaces/transactions.types';
import { buildTransactionFilter } from './transactions-filter';
import {
	PERIOD_FORMATS,
	resolveTimezone,
	shapeSummary,
} from './transactions-summary';

export interface ITransactionActor {
	_id: string;
	employeeId?: string;
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

@Injectable()
export class TransactionsService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.transaction)
		private readonly _transactionModel: Model<Transaction>,
		private readonly _employeesService: EmployeesService,
	) {}

	//#endregion

	//#region Public Methods

	public async create(
		actor: ITransactionActor,
		createTransactionDto: CreateTransactionDto,
	): Promise<ITransaction> {
		await this._assertCanManage(actor);

		const name: string = this._parseName(createTransactionDto.name);

		const now: Date = new Date();

		return await this._transactionModel.create({
			userId: actor._id,
			createdByUserId: actor._id,
			createdByEmployeeId: actor.employeeId ?? null,
			...this._parseFields(createTransactionDto, name),
			createdDate: createTransactionDto.createdDate
				? new Date(createTransactionDto.createdDate)
				: now,
			createdAt: now,
			updatedAt: now,
		});
	}

	public async update(
		actor: ITransactionActor,
		id: string,
		updateTransactionDto: UpdateTransactionDto,
	): Promise<ITransaction> {
		await this._assertCanManage(actor);

		this._assertValidId(id);

		const name: string = this._parseName(updateTransactionDto.name);

		const filter = { _id: id, userId: actor._id };

		const existing: Transaction | null =
			await this._transactionModel.findOne(filter);

		if (!existing) {
			throw new NotFoundException('Transaction not found.');
		}

		const updated: Transaction | null =
			await this._transactionModel.findOneAndUpdate(
				filter,
				{
					$set: {
						...this._parseFields(updateTransactionDto, name),
						// Cleared on edit ⇒ back to when the record was created.
						createdDate: updateTransactionDto.createdDate
							? new Date(updateTransactionDto.createdDate)
							: existing.createdAt,
						updatedAt: new Date(),
					},
				},
				{ new: true },
			);

		if (!updated) {
			throw new NotFoundException('Transaction not found.');
		}

		return updated;
	}

	public async remove(actor: ITransactionActor, id: string): Promise<void> {
		await this._assertCanManage(actor);

		this._assertValidId(id);

		// A real delete, on purpose: no soft delete for transactions.
		const result = await this._transactionModel.deleteOne({
			_id: id,
			userId: actor._id,
		});

		if (!result.deletedCount) {
			throw new NotFoundException('Transaction not found.');
		}
	}

	public async findByUserTableState(
		actor: ITransactionActor,
		tableState: ITableStateRequest<ITransaction>,
	): Promise<ITableStateResponse<ITransaction[]>> {
		await this._assertCanManage(actor);

		const filter: FilterQuery<Transaction> = buildTransactionFilter(
			actor._id,
			tableState,
		);

		const total: number = await this._transactionModel.countDocuments(filter);

		const transactions: Transaction[] = await this._transactionModel.find(
			filter,
			null,
			queryOptions<ITransaction>({
				...tableState,
				sort: tableState?.sort?.field
					? tableState.sort
					: { field: 'createdDate', order: 'descend' },
			}),
		);

		return { total, data: transactions };
	}

	public async summary(
		actor: ITransactionActor,
		request: ITransactionSummaryRequest,
	): Promise<ITransactionSummary> {
		await this._assertCanManage(actor);

		const filter: FilterQuery<Transaction> = buildTransactionFilter(
			actor._id,
			request,
			{ excludeCanceledByDefault: true },
		);

		const format: string =
			PERIOD_FORMATS[request?.granularity === 'day' ? 'day' : 'month'];

		const timezone: string = resolveTimezone(request?.timezone);

		const [totalsRows, categoryRows, periodRows] = await Promise.all([
			this._transactionModel.aggregate([
				{ $match: filter },
				{ $group: { _id: '$type', total: { $sum: '$value' } } },
			]),
			this._transactionModel.aggregate([
				{
					$match: {
						$and: [filter, { type: TransactionsEnum.Type.EXPENSE }],
					},
				},
				{
					$addFields: {
						share: {
							$divide: [
								'$value',
								{ $max: [1, { $size: { $ifNull: ['$categoriesIds', []] } }] },
							],
						},
					},
				},
				{
					$unwind: {
						path: '$categoriesIds',
						preserveNullAndEmptyArrays: true,
					},
				},
				{ $group: { _id: '$categoriesIds', total: { $sum: '$share' } } },
			]),
			this._transactionModel.aggregate([
				{ $match: filter },
				{
					$group: {
						_id: {
							period: {
								$dateToString: { format, date: '$createdDate', timezone },
							},
							type: '$type',
						},
						total: { $sum: '$value' },
					},
				},
			]),
		]);

		return shapeSummary(totalsRows, categoryRows, periodRows);
	}

	//#endregion

	//#region Private Methods

	// An employee of level EMPLOYEE must not see or change the finances. Checked
	// here (not only hidden in the UI) by loading the acting employee.
	private async _assertCanManage(actor: ITransactionActor): Promise<void> {
		if (!actor.employeeId) {
			return;
		}

		const employee = await this._employeesService.findByIdOrFail(
			actor.employeeId,
		);

		if (employee.level === EmployeesEnum.Level.EMPLOYEE) {
			throw new ForbiddenException(
				'Your level cannot access income and expenses.',
			);
		}
	}

	private _assertValidId(id: string): void {
		if (!Types.ObjectId.isValid(id)) {
			throw new NotFoundException('Transaction not found.');
		}
	}

	private _parseName(name: string): string {
		const trimmed: string = name.trim();

		if (!trimmed) {
			throw new BadRequestException('Name is required.');
		}

		return trimmed;
	}

	// Only the fields a client may set. `userId` and the creator ids are never
	// read from the body.
	private _parseFields(
		dto: CreateTransactionDto,
		name: string,
	): Pick<
		Transaction,
		| 'name'
		| 'type'
		| 'value'
		| 'status'
		| 'note'
		| 'tagsIds'
		| 'categoriesIds'
		| 'storeIds'
	> {
		return {
			name,
			type: dto.type,
			value: round2(dto.value),
			status: dto.status,
			note: dto.note?.trim() || null,
			tagsIds: dto.tagsIds ?? [],
			categoriesIds: dto.categoriesIds ?? [],
			storeIds: dto.storeIds ?? [],
		};
	}

	//#endregion
}
