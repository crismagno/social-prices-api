import { Response } from 'express';

import {
	Controller,
	Get,
	InternalServerErrorException,
	Param,
	Res,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { FilesService } from '../../infra/services/files/files-service';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';

@Controller('api/v1/files')
export class FilesController {
	constructor(private _filesService: FilesService) {}

	@Get('/download/:filename')
	@UsePipes(ValidationPipe)
	public async downloadFile(
		@Param('filename', ValidationParamsPipe) filename: string,
		@Res() res: Response,
	): Promise<any> {
		const fileBuffer: Buffer | null =
			await this._filesService.getFileBufferByFilename(filename);

		if (!fileBuffer) {
			throw new InternalServerErrorException(
				'Error when attempt download file',
			);
		}

		res.set({
			'Content-Disposition': `attachment; filename=${filename}`,
		});

		res.send(fileBuffer);
	}
}
