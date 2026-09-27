import {
	Body,
	Controller,
	Delete,
	Param,
	Patch,
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
import CreateNoteDto from './interfaces/dto/createNote.dto';
import UpdateNoteDto from './interfaces/dto/updateNote.dto';
import UpdateNoteStatusDto from './interfaces/dto/updateNoteStatus.dto';
import { INote } from './interfaces/note.interface';
import {
	INoteCalendarMarker,
	INoteCalendarMarkersRequest,
} from './interfaces/notes.types';
import { INoteActor, NotesService } from './notes.service';

const toActor = (authPayload: IAuthPayload): INoteActor => ({
	_id: authPayload._id,
	employeeId: authPayload.employeeId,
});

@Controller('api/v1/notes')
export class NotesController {
	constructor(private readonly _notesService: NotesService) {}

	@Post()
	@UsePipes(ValidationPipe)
	public async create(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() createNoteDto: CreateNoteDto,
	): Promise<INote> {
		return await this._notesService.create(toActor(authPayload), createNoteDto);
	}

	@Post('/userTableState')
	public async findByUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<INote>,
	): Promise<ITableStateResponse<INote[]>> {
		return await this._notesService.findByUserTableState(
			toActor(authPayload),
			tableState,
		);
	}

	@Post('/calendarMarkers')
	public async calendarMarkers(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() request: INoteCalendarMarkersRequest,
	): Promise<INoteCalendarMarker[]> {
		return await this._notesService.calendarMarkers(
			toActor(authPayload),
			request,
		);
	}

	@Put('/:id')
	@UsePipes(ValidationPipe)
	public async update(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('id') id: string,
		@Body() updateNoteDto: UpdateNoteDto,
	): Promise<INote> {
		return await this._notesService.update(
			toActor(authPayload),
			id,
			updateNoteDto,
		);
	}

	@Patch('/:id/status')
	@UsePipes(ValidationPipe)
	public async updateStatus(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('id') id: string,
		@Body() updateNoteStatusDto: UpdateNoteStatusDto,
	): Promise<INote> {
		return await this._notesService.updateStatus(
			toActor(authPayload),
			id,
			updateNoteStatusDto,
		);
	}

	@Delete('/:id')
	public async remove(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('id') id: string,
	): Promise<void> {
		await this._notesService.remove(toActor(authPayload), id);
	}
}
