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
import CreateNoteDto from './interfaces/dto/createNote.dto';
import UpdateNoteDto from './interfaces/dto/updateNote.dto';
import UpdateNoteStatusDto from './interfaces/dto/updateNoteStatus.dto';
import { INote } from './interfaces/note.interface';
import { Note } from './interfaces/note.schema';
import {
	INoteCalendarMarker,
	INoteCalendarMarkersRequest,
} from './interfaces/notes.types';
import { shapeCalendarMarkers } from './notes-calendar';
import { buildNoteFilter } from './notes-filter';

export interface INoteActor {
	_id: string;
	employeeId?: string;
}

@Injectable()
export class NotesService {
	//#region Constructor

	constructor(
		@InjectModel(schemasName.note)
		private readonly _noteModel: Model<Note>,
	) {}

	//#endregion

	//#region Public Methods

	public async create(
		actor: INoteActor,
		createNoteDto: CreateNoteDto,
	): Promise<INote> {
		const { title, text } = this._parseTitleAndText(createNoteDto);

		const now: Date = new Date();

		return await this._noteModel.create({
			userId: actor._id,
			createdByUserId: actor._id,
			createdByEmployeeId: actor.employeeId ?? null,
			title,
			text,
			date: new Date(createNoteDto.date),
			status: createNoteDto.status,
			color: createNoteDto.color?.trim() || null,
			tagsIds: createNoteDto.tagsIds ?? [],
			categoriesIds: createNoteDto.categoriesIds ?? [],
			customerIds: createNoteDto.customerIds ?? [],
			saleIds: createNoteDto.saleIds ?? [],
			storeIds: createNoteDto.storeIds ?? [],
			createdAt: now,
			updatedAt: now,
		});
	}

	public async update(
		actor: INoteActor,
		id: string,
		updateNoteDto: UpdateNoteDto,
	): Promise<INote> {
		this._assertValidId(id);

		const { title, text } = this._parseTitleAndText(updateNoteDto);

		const updated: Note | null = await this._noteModel.findOneAndUpdate(
			{ _id: id, userId: actor._id },
			{
				$set: {
					title,
					text,
					date: new Date(updateNoteDto.date),
					status: updateNoteDto.status,
					color: updateNoteDto.color?.trim() || null,
					tagsIds: updateNoteDto.tagsIds ?? [],
					categoriesIds: updateNoteDto.categoriesIds ?? [],
					customerIds: updateNoteDto.customerIds ?? [],
					saleIds: updateNoteDto.saleIds ?? [],
					storeIds: updateNoteDto.storeIds ?? [],
					updatedAt: new Date(),
				},
			},
			{ new: true },
		);

		if (!updated) {
			throw new NotFoundException('Note not found.');
		}

		return updated;
	}

	public async updateStatus(
		actor: INoteActor,
		id: string,
		updateNoteStatusDto: UpdateNoteStatusDto,
	): Promise<INote> {
		this._assertValidId(id);

		const updated: Note | null = await this._noteModel.findOneAndUpdate(
			{ _id: id, userId: actor._id },
			{ $set: { status: updateNoteStatusDto.status, updatedAt: new Date() } },
			{ new: true },
		);

		if (!updated) {
			throw new NotFoundException('Note not found.');
		}

		return updated;
	}

	public async remove(actor: INoteActor, id: string): Promise<void> {
		this._assertValidId(id);

		// A real delete, on purpose: no soft delete for notes.
		const result = await this._noteModel.deleteOne({
			_id: id,
			userId: actor._id,
		});

		if (!result.deletedCount) {
			throw new NotFoundException('Note not found.');
		}
	}

	public async findByUserTableState(
		actor: INoteActor,
		tableState: ITableStateRequest<INote>,
	): Promise<ITableStateResponse<INote[]>> {
		const filter: FilterQuery<Note> = buildNoteFilter(actor._id, tableState);

		const total: number = await this._noteModel.countDocuments(filter);

		const notes: Note[] = await this._noteModel.find(
			filter,
			null,
			queryOptions<INote>({
				...tableState,
				sort: tableState?.sort?.field
					? tableState.sort
					: { field: 'date', order: 'descend' },
			}),
		);

		return { total, data: notes };
	}

	public async calendarMarkers(
		actor: INoteActor,
		request: INoteCalendarMarkersRequest,
	): Promise<INoteCalendarMarker[]> {
		const filter: FilterQuery<Note> = {
			...buildNoteFilter(actor._id, request),
			date: {
				$gte: new Date(request.monthStart),
				$lte: new Date(request.monthEnd),
			},
		};

		const rows = await this._noteModel.aggregate([
			{ $match: filter },
			{
				$group: {
					_id: {
						date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
						status: '$status',
					},
					count: { $sum: 1 },
					colors: { $addToSet: '$color' },
				},
			},
		]);

		return shapeCalendarMarkers(rows);
	}

	//#endregion

	//#region Private Methods

	private _assertValidId(id: string): void {
		if (!Types.ObjectId.isValid(id)) {
			throw new NotFoundException('Note not found.');
		}
	}

	private _parseTitleAndText(dto: { title: string; text: string }): {
		title: string;
		text: string;
	} {
		const title: string = dto.title.trim();
		const text: string = dto.text.trim();

		if (!title || !text) {
			throw new BadRequestException('Title and text are required.');
		}

		return { title, text };
	}

	//#endregion
}
