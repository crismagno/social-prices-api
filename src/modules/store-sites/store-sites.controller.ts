import {
	BadRequestException,
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Post,
	Put,
	Query,
	UploadedFiles,
	UseGuards,
	UseInterceptors,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { parseFilePipeBuilder } from '../../shared/pipes/parse-file-builder-pipe';
import { ValidationParamsPipe } from '../../shared/pipes/validation-params-pipe';
import { AppEnabledGuard } from '../apps/core/guards/app-enabled.guard';
import { RequiresApp } from '../apps/core/guards/requires-app.decorator';
import AppsEnum from '../apps/interfaces/apps.enum';
import { AuthPayload } from '../auth/decorators/current-user.decorator';
import { IAuthPayload } from '../auth/interfaces/auth.types';
import { FilesService } from '../files/files-service';
import SaveStoreSiteDto from './interfaces/dto/saveStoreSite.dto';
import { IStoreSite } from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { StoreSitesService } from './store-sites.service';

const validation = new ValidationPipe({ transform: true, whitelist: true });

/** What the owner does with the site of a store: edit, name, publish. */
@RequiresApp(AppsEnum.App.SITE)
@UseGuards(AppEnabledGuard)
@Controller('api/v1/store-sites')
export class StoreSitesController {
	constructor(
		private readonly _storeSitesService: StoreSitesService,
		private readonly _filesService: FilesService,
	) {}

	@Get('/store/:storeId')
	public async findByStoreId(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId', ValidationParamsPipe) storeId: string,
	): Promise<IStoreSite | null> {
		return await this._storeSitesService.findByStoreId(
			authPayload._id,
			storeId,
		);
	}

	@Put('/store/:storeId')
	@UsePipes(validation)
	public async save(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId', ValidationParamsPipe) storeId: string,
		@Body() saveStoreSiteDto: SaveStoreSiteDto,
	): Promise<IStoreSite> {
		return await this._storeSitesService.save(
			authPayload._id,
			storeId,
			saveStoreSiteDto,
		);
	}

	@Get('/slug-available/:slug')
	public async isSlugAvailable(
		@Param('slug', ValidationParamsPipe) slug: string,
		@Query('storeId') storeId?: string,
	): Promise<{ available: boolean }> {
		const isValid: boolean = StoreSitesEnum.SLUG_REGEX.test(
			String(slug).trim().toLowerCase(),
		);

		return {
			available:
				isValid &&
				(await this._storeSitesService.isSlugAvailable(slug, storeId)),
		};
	}

	@Post('/store/:storeId/publish')
	@HttpCode(200)
	public async publish(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId', ValidationParamsPipe) storeId: string,
	): Promise<IStoreSite> {
		return await this._storeSitesService.setPublished(
			authPayload._id,
			storeId,
			true,
		);
	}

	@Post('/store/:storeId/unpublish')
	@HttpCode(200)
	public async unpublish(
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId', ValidationParamsPipe) storeId: string,
	): Promise<IStoreSite> {
		return await this._storeSitesService.setPublished(
			authPayload._id,
			storeId,
			false,
		);
	}

	/** Stores one image of the site and answers with its file key. */
	@Post('/store/:storeId/images')
	@HttpCode(200)
	@UseInterceptors(FilesInterceptor('files', 1))
	public async uploadImage(
		@UploadedFiles(
			parseFilePipeBuilder({
				allowOnlyTypes: ['image'],
				build: { fileIsRequired: true },
			}),
		)
		files: Express.Multer.File[],
		@AuthPayload() authPayload: IAuthPayload,
		@Param('storeId', ValidationParamsPipe) storeId: string,
	): Promise<{ url: string }> {
		await this._storeSitesService.assertOwnStore(authPayload._id, storeId);

		if (files[0].size > StoreSitesEnum.MAX_IMAGE_SIZE_BYTES) {
			throw new BadRequestException({
				code: 'STORE_SITE_IMAGE_TOO_LARGE',
				message: 'The image can be at most 5MB.',
			});
		}

		const [url]: string[] = await this._filesService.getUploadFilesUrl(files);

		return { url };
	}
}
