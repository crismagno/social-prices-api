import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { FilesUploadsService } from './files-uploads.service';
import { IFileUpload } from './interfaces/file-upload.interface';

@Controller('api/v1/files-uploads')
export class FilesUploadsController {
	constructor(private _filesUploadsService: FilesUploadsService) {}

	@Post('/userTableState')
	@UsePipes(ValidationPipe)
	public async findByUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<IFileUpload>,
	): Promise<ITableStateResponse<IFileUpload[]>> {
		return await this._filesUploadsService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/:fileUploadId')
	public async findById(
		@Param('fileUploadId', ValidationParamsPipe) fileUploadId: string,
	): Promise<IFileUpload | null> {
		return await this._filesUploadsService.findById(fileUploadId);
	}
}
