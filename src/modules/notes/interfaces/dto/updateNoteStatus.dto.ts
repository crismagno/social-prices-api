import { IsEnum } from 'class-validator';

import NotesEnum from '../notes.enum';

export default class UpdateNoteStatusDto {
	@IsEnum(NotesEnum.Status)
	status: NotesEnum.Status;
}
