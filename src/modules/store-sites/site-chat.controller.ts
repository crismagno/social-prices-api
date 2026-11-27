import { Response } from 'express';

import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Headers,
	HttpCode,
	Ip,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Res,
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Public } from '../../shared/decorators/custom.decorator';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import { mediaResponseHeaders } from '../apps/telegram/telegram.media-response';
import { STORE_CHAT_MAX_UPLOAD_BYTES } from '../store-chat/store-chat.constants';
import {
	ISiteChatMessageView,
	ISiteChatVisitor,
	ISiteContactForm,
	SiteChatService,
} from './site-chat.service';

/** The header the visitor's chat window sends its secret in. */
const TOKEN_HEADER = 'x-site-chat-token';

/** The chat of a store's site, as a visitor without an account reaches it. */
@Controller('api/v1/public/store-sites/:slug/chat')
export class SiteChatController {
	constructor(private readonly _siteChatService: SiteChatService) {}

	@Public()
	@Post()
	@HttpCode(201)
	public async start(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Ip() visitorAddress: string,
		@Body() visitor: ISiteChatVisitor,
	): Promise<{ token: string }> {
		return await this._siteChatService.start(
			slug,
			visitorAddress,
			visitor ?? {},
		);
	}

	// The form of the contact page: who writes and what, in one request.
	@Public()
	@Post('/contact')
	@HttpCode(201)
	public async contact(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Ip() visitorAddress: string,
		@Body() form: ISiteContactForm,
	): Promise<{ token: string | null }> {
		return await this._siteChatService.contact(
			slug,
			visitorAddress,
			form ?? {},
		);
	}

	@Public()
	@Get('/messages')
	public async messages(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Headers(TOKEN_HEADER) token: string,
	): Promise<ISiteChatMessageView[]> {
		return await this._siteChatService.messages(slug, token);
	}

	@Public()
	@Post('/messages')
	@HttpCode(201)
	public async send(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Headers(TOKEN_HEADER) token: string,
		@Body() body: { text?: unknown },
	): Promise<ISiteChatMessageView> {
		return await this._siteChatService.send(slug, token, body?.text);
	}

	// The visitor is writing: the store's inbox shows it. Never fails the window.
	// New words for a message the visitor wrote.
	@Public()
	@Patch('/messages/:messageId')
	public async editMessage(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Param('messageId', ValidationParamsPipe) messageId: string,
		@Headers(TOKEN_HEADER) token: string,
		@Body() body: { text?: unknown },
	): Promise<ISiteChatMessageView> {
		return await this._siteChatService.editMessage(
			slug,
			token,
			messageId,
			body?.text,
		);
	}

	@Public()
	@Delete('/messages/:messageId')
	@HttpCode(204)
	public async deleteMessage(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Param('messageId', ValidationParamsPipe) messageId: string,
		@Headers(TOKEN_HEADER) token: string,
	): Promise<void> {
		await this._siteChatService.deleteMessage(slug, token, messageId);
	}

	@Public()
	@Post('/typing')
	@HttpCode(204)
	public async typing(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Headers(TOKEN_HEADER) token: string,
	): Promise<void> {
		await this._siteChatService.typing(slug, token);
	}

	// Whether the store is writing to this visitor right now.
	@Public()
	@Get('/typing')
	public async storeTyping(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Headers(TOKEN_HEADER) token: string,
	): Promise<{ isStoreTyping: boolean }> {
		return await this._siteChatService.storeTyping(slug, token);
	}

	// A file or a recording of the visitor; the text, when there is one, goes with it.
	@Public()
	@Post('/media')
	@HttpCode(201)
	@UseInterceptors(
		FileInterceptor('file', {
			limits: { fileSize: STORE_CHAT_MAX_UPLOAD_BYTES, files: 1 },
		}),
	)
	public async sendMedia(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Headers(TOKEN_HEADER) token: string,
		@UploadedFile() file: Express.Multer.File,
		@Body() body: { caption?: unknown; voice?: unknown },
	): Promise<ISiteChatMessageView> {
		if (!file?.buffer?.length) {
			throw new BadRequestException('A file is required.');
		}

		return await this._siteChatService.sendMedia(
			slug,
			token,
			{
				buffer: file.buffer,
				// Multer reads the name as latin1; the browser sent UTF-8.
				fileName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
				mimeType: file.mimetype,
			},
			{
				caption: body?.caption,
				asVoice: body?.voice === true || body?.voice === 'true',
			},
		);
	}

	@Public()
	@Get('/messages/:messageId/attachments/:index')
	public async attachment(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Param('messageId') messageId: string,
		@Param('index', ParseIntPipe) index: number,
		@Headers(TOKEN_HEADER) token: string,
		@Res() res: Response,
	): Promise<void> {
		const file = await this._siteChatService.attachment(
			slug,
			token,
			messageId,
			index,
		);

		res.set(mediaResponseHeaders(file.contentType, file.fileName ?? 'file'));
		res.send(file.buffer);
	}
}
