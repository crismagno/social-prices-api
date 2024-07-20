import { FilterQuery, Model } from 'mongoose';

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import CreateTagDto from './interfaces/dto/createTag.dto';
import CreateTagMultiDto from './interfaces/dto/createTagMulti.dto';
import UpdateTagDto from './interfaces/dto/updateTag.dto';
import TagsEnum from './interfaces/tags.enum';
import { ITag } from './interfaces/tags.interface';

@Injectable()
export class TagsService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.tag)
		private readonly _tagModel: Model<ITag>,
	) {
		this._logger = new Logger(TagsService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(tagId: string): Promise<ITag | null> {
		return this._tagModel.findById(tagId);
	}

	public async findByIdOrFail(tagId: string): Promise<ITag> {
		const tag: ITag | null = await this.findById(tagId);

		if (!tag) {
			throw new NotFoundException('Tag not found!');
		}

		return tag;
	}

	public async findByUserIdTypeName(
		userId: string,
		type: TagsEnum.Type,
		name: string,
	): Promise<ITag | null> {
		return this._tagModel.findOne({
			userId,
			type,
			name,
		});
	}

	public async validateCreateOrUpdate(
		userId: string,
		type: TagsEnum.Type,
		name: string,
		tagId?: string,
	): Promise<void> {
		const tag: ITag | null = await this.findByUserIdTypeName(
			userId,
			type,
			name,
		);

		if (!tag) {
			return;
		}

		if (tag._id.toString() === tagId) {
			return;
		}

		throw new BadRequestException(
			`Already exists a tag by same type "${TagsEnum.TypeLabels[type]}" and name: ${name}`,
		);
	}

	public async findByUserTableState(
		userId: string,
		tableState: ITableStateRequest<ITag>,
	): Promise<ITableStateResponse<ITag[]>> {
		const filter: FilterQuery<ITag> = {
			userId,
		};

		if (tableState.search) {
			const search = new RegExp(tableState.search, 'ig');

			filter.$or = [{ name: search }, { description: search }];
		}

		if (tableState.filters?.type?.length) {
			filter.type = { $in: tableState.filters.type as TagsEnum.Type[] };
		}

		const response: ITableStateResponse<ITag[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._tagModel.countDocuments(filter);
		response.data = await this._tagModel.find(
			filter,
			null,
			queryOptions<ITag>(tableState),
		);

		return response;
	}

	public async findByType(
		type: TagsEnum.Type,
		userId: string,
	): Promise<ITag[]> {
		return this._tagModel.find({
			type,
			userId,
		});
	}

	public async create(createTagDto: CreateTagDto): Promise<ITag> {
		const now: Date = new Date();

		await this.validateCreateOrUpdate(
			createTagDto.userId,
			createTagDto.type,
			createTagDto.name,
		);

		const tag = new this._tagModel({
			name: createTagDto.name,
			description: createTagDto.description,
			color: createTagDto.color,
			type: createTagDto.type,
			userId: createTagDto.userId,
			createdAt: now,
			updatedAt: now,
		});

		const newTag: ITag = await tag.save();

		return newTag;
	}

	public async update(updateTagDto: UpdateTagDto): Promise<ITag> {
		const tag: ITag = await this.findByIdOrFail(updateTagDto.tagId);

		await this.validateCreateOrUpdate(
			tag.userId.toString(),
			updateTagDto.type,
			updateTagDto.name,
			updateTagDto.tagId,
		);

		const tagUpdated: ITag = await this._tagModel.findByIdAndUpdate(
			updateTagDto.tagId,
			{
				$set: {
					name: updateTagDto.name,
					color: updateTagDto.color,
					type: updateTagDto.type,
					description: updateTagDto.description,
				},
			},
			{
				new: true,
			},
		);

		return tagUpdated;
	}

	public async createMulti(createTagsDto: CreateTagMultiDto): Promise<void> {
		const now: Date = new Date();

		const tagsToCreate = await Promise.all(
			createTagsDto.tags.map(async (tag: CreateTagDto) => {
				await this.validateCreateOrUpdate(tag.userId, tag.type, tag.name);

				return {
					...tag,
					createdByUserId: tag.userId,
					createdAt: now,
					updatedAt: now,
				};
			}),
		);

		await this._tagModel.create(tagsToCreate);
	}

	// #endregion
}
