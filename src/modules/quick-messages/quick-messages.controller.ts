import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Patch,
	Post,
	Put,
	UploadedFiles,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { AppEmployeeLevelGuard } from '../apps/core/guards/app-employee-level.guard';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { MAX_UPLOAD_BYTES } from '../inbox/inbox.constants';
import {
	QuickMessageDeleteDto,
	QuickMessageSendDto,
	QuickMessageUpsertDto,
} from './interfaces/dto/quick-message-upsert.dto';
import { IQuickMessage } from './interfaces/quick-message.interface';
import QuickMessagesEnum from './interfaces/quick-messages.enum';
import {
	IQuickMessageActor,
	IQuickMessageAvailable,
	IQuickMessageFieldInfo,
	IQuickMessageSendResult,
} from './interfaces/quick-messages.type';
import { listFieldInfo } from './quick-messages-fields';
import { QuickMessagesSenderService } from './quick-messages-sender.service';
import { QuickMessagesService } from './quick-messages.service';

const validation = new ValidationPipe({ transform: true });

const toActor = (authPayload: IAuthPayload): IQuickMessageActor => ({
	ownerUserId: authPayload._id,
	employeeId: authPayload.employeeId ?? null,
});

const filesInterceptor = FilesInterceptor(
	'files',
	QuickMessagesEnum.MAX_BLOCKS,
	{ limits: { fileSize: MAX_UPLOAD_BYTES } },
);

// The editor sends the message as JSON in a `data` field, next to its files.
const parseUpsert = async (raw: string): Promise<QuickMessageUpsertDto> => {
	let plain: unknown;

	try {
		plain = JSON.parse(raw ?? '');
	} catch {
		throw new BadRequestException('Invalid quick message data.');
	}

	const dto: QuickMessageUpsertDto = plainToInstance(
		QuickMessageUpsertDto,
		plain,
	);

	const errors: ValidationError[] = await validate(dto);

	if (errors.length) {
		throw new BadRequestException(
			errors.flatMap((error: ValidationError) =>
				Object.values(error.constraints ?? { [error.property]: 'is invalid' }),
			),
		);
	}

	return dto;
};

// Multer reads the name as latin1; the browser sent UTF-8.
const fixNames = (files: Express.Multer.File[]): Express.Multer.File[] =>
	(files ?? []).map((file: Express.Multer.File) => ({
		...file,
		originalname: Buffer.from(file.originalname, 'latin1').toString('utf8'),
	}));

@Controller('api/v1/quick-messages')
export class QuickMessagesController {
	constructor(
		private readonly _quickMessagesService: QuickMessagesService,
		private readonly _senderService: QuickMessagesSenderService,
	) {}

	//#region Chat

	@Get('/available')
	public async listAvailable(
		@AuthPayload() authPayload: IAuthPayload,
	): Promise<IQuickMessageAvailable[]> {
		return this._quickMessagesService.listAvailable(toActor(authPayload));
	}

	@Get('/fields')
	public listFields(): IQuickMessageFieldInfo[] {
		return listFieldInfo();
	}

	@Post('/:id/send')
	@HttpCode(200)
	@UsePipes(validation)
	public async send(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('id') id: string,
		@Body() dto: QuickMessageSendDto,
	): Promise<IQuickMessageSendResult> {
		return this._senderService.send(
			toActor(authPayload),
			id,
			dto.conversationId,
		);
	}

	//#endregion

	//#region Management (owner, ADMIN, MASTER)

	@Post('/userTableState')
	@HttpCode(200)
	@UseGuards(AppEmployeeLevelGuard)
	public async findTable(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<IQuickMessage>,
	): Promise<ITableStateResponse<IQuickMessage[]>> {
		return this._quickMessagesService.findTable(authPayload._id, tableState);
	}

	@Get('/:id')
	@UseGuards(AppEmployeeLevelGuard)
	public async findOne(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('id') id: string,
	): Promise<IQuickMessage> {
		return this._quickMessagesService.findOneOwned(authPayload._id, id);
	}

	@Post()
	@UseGuards(AppEmployeeLevelGuard)
	@UseInterceptors(filesInterceptor)
	public async create(
		@AuthPayload() authPayload: IAuthPayload,
		@Body('data') data: string,
		@UploadedFiles() files: Express.Multer.File[],
	): Promise<IQuickMessage> {
		return this._quickMessagesService.create(
			toActor(authPayload),
			await parseUpsert(data),
			fixNames(files),
		);
	}

	@Put('/:id')
	@UseGuards(AppEmployeeLevelGuard)
	@UseInterceptors(filesInterceptor)
	public async update(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('id') id: string,
		@Body('data') data: string,
		@UploadedFiles() files: Express.Multer.File[],
	): Promise<IQuickMessage> {
		return this._quickMessagesService.update(
			toActor(authPayload),
			id,
			await parseUpsert(data),
			fixNames(files),
		);
	}

	@Patch('/:id/delete')
	@HttpCode(204)
	@UseGuards(AppEmployeeLevelGuard)
	@UsePipes(validation)
	public async deleteManual(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('id') id: string,
		@Body() dto: QuickMessageDeleteDto,
	): Promise<void> {
		await this._quickMessagesService.deleteManual(
			toActor(authPayload),
			id,
			dto?.reason ?? null,
		);
	}

	@Patch('/:id/activate')
	@HttpCode(204)
	@UseGuards(AppEmployeeLevelGuard)
	public async activateManual(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('id') id: string,
	): Promise<void> {
		await this._quickMessagesService.activateManual(toActor(authPayload), id);
	}

	//#endregion
}
