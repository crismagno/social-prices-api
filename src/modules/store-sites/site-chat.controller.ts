import {
	Body,
	Controller,
	Get,
	Headers,
	HttpCode,
	Ip,
	Param,
	Post,
} from '@nestjs/common';

import { Public } from '../../shared/decorators/custom.decorator';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import {
	ISiteChatMessageView,
	ISiteChatVisitor,
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
}
