import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Put,
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
import CreateTagDto from './interfaces/dto/createTag.dto';
import CreateTagMultiDto from './interfaces/dto/createTagMulti.dto';
import UpdateTagDto from './interfaces/dto/updateTag.dto';
import TagsEnum from './interfaces/tags.enum';
import { ITag } from './interfaces/tags.interface';
import { TagsService } from './tags.service';

@Controller('api/v1/tags')
export class TagsController {
	constructor(private _tagsService: TagsService) {}

	@Post('/userTableState')
	@UsePipes(ValidationPipe)
	public async findByUserTableState(
		@AuthPayload() authPayload: IAuthPayload,
		@Body() tableState: ITableStateRequest<ITag>,
	): Promise<ITableStateResponse<ITag[]>> {
		return await this._tagsService.findByUserTableState(
			authPayload._id,
			tableState,
		);
	}

	@Get('/type/:type')
	public async findByType(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('type', ValidationParamsPipe) type: TagsEnum.Type,
	): Promise<ITag[]> {
		return await this._tagsService.findByType(authPayload._id, type);
	}

	@Get('/:tagId')
	public async findById(
		@Param('tagId', ValidationParamsPipe) tagId: string,
	): Promise<ITag | null> {
		return await this._tagsService.findById(tagId);
	}

	@Post('/')
	@UsePipes(ValidationPipe)
	public async create(@Body() createTagDto: CreateTagDto): Promise<ITag> {
		return await this._tagsService.create(createTagDto);
	}

	@Put('/')
	@UsePipes(ValidationPipe)
	public async update(@Body() updateTagDto: UpdateTagDto): Promise<ITag> {
		return await this._tagsService.update(updateTagDto);
	}

	@Post('/multi')
	@UsePipes(ValidationPipe)
	public async createMulti(
		@Body() createTagsDto: CreateTagMultiDto,
	): Promise<void> {
		await this._tagsService.createMulti(createTagsDto);
	}
}
