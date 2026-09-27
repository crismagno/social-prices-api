import { escapeRegExp } from 'lodash';
import { FilterQuery, Model, Types } from 'mongoose';

import {
	BadRequestException,
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
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import CreateFeedbackDto from './interfaces/dto/createFeedback.dto';
import UpdateFeedbackStatusDto from './interfaces/dto/updateFeedbackStatus.dto';
import { IFeedback } from './interfaces/feedback.interface';
import { Feedback } from './interfaces/feedback.schema';
import FeedbacksEnum from './interfaces/feedbacks.enum';

export interface IFeedbackSender {
	_id: string;
	email: string;
	employeeId?: string;
}

@Injectable()
export class FeedbacksService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.feedback)
		private readonly _feedbackModel: Model<Feedback>,
		private readonly _usersService: UsersService,
	) {}

	//#endregion

	//#region Public Methods

	public async create(
		sender: IFeedbackSender,
		createFeedbackDto: CreateFeedbackDto,
	): Promise<void> {
		const message: string = createFeedbackDto.message.trim();

		if (!message) {
			throw new BadRequestException('Feedback message is required.');
		}

		const user: IUser = await this._usersService.findOneByIdOrFail(sender._id);

		await this._feedbackModel.create({
			userId: sender._id,
			employeeId: sender.employeeId ?? null,
			email: sender.email,
			name: user.name ?? null,
			message,
			status: FeedbacksEnum.Status.NEW,
			statusUpdatedAt: null,
			statusUpdatedByManagerId: null,
		});
	}

	public async findByTableState(
		tableState: ITableStateRequest<IFeedback>,
	): Promise<ITableStateResponse<IFeedback[]>> {
		const filter: FilterQuery<Feedback> = {};

		const searchText: string | undefined = tableState?.search?.trim();

		if (searchText) {
			const search: RegExp = new RegExp(escapeRegExp(searchText), 'i');

			filter.$or = [{ message: search }, { email: search }, { name: search }];
		}

		if (tableState?.filters?.status?.length) {
			filter.status = { $in: tableState.filters.status };
		}

		const total: number = await this._feedbackModel.countDocuments(filter);

		const feedbacks: Feedback[] = await this._feedbackModel.find(
			filter,
			null,
			queryOptions<IFeedback>({
				...tableState,
				sort: tableState?.sort?.field
					? tableState.sort
					: { field: 'createdAt', order: 'descend' },
			}),
		);

		return { total, data: feedbacks };
	}

	public async findById(id: string): Promise<IFeedback> {
		if (!Types.ObjectId.isValid(id)) {
			throw new NotFoundException('Feedback not found.');
		}

		const feedback: Feedback | null = await this._feedbackModel.findById(id);

		if (!feedback) {
			throw new NotFoundException('Feedback not found.');
		}

		return feedback;
	}

	public async updateStatus(
		id: string,
		updateFeedbackStatusDto: UpdateFeedbackStatusDto,
		managerId: string,
	): Promise<IFeedback> {
		if (!Types.ObjectId.isValid(id)) {
			throw new NotFoundException('Feedback not found.');
		}

		const feedback: Feedback | null =
			await this._feedbackModel.findByIdAndUpdate(
				id,
				{
					$set: {
						status: updateFeedbackStatusDto.status,
						statusUpdatedAt: new Date(),
						statusUpdatedByManagerId: new Types.ObjectId(managerId),
					},
				},
				{ new: true },
			);

		if (!feedback) {
			throw new NotFoundException('Feedback not found.');
		}

		return feedback;
	}

	//#endregion
}
