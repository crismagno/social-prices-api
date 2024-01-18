import { ManagedUpload } from 'aws-sdk/clients/s3';
import { Model } from 'mongoose';

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { AmazonFilesService } from '../config/services/amazon/amazon-files-service';
import { NotificationService } from '../notification/notification.service';
import { schemasName } from '../shared/modules/imports/schemas/schemas';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import CreateStoreDto from './interfaces/dto/createStore.dto';
import StoresEnum from './interfaces/stores.enum';
import { IStore } from './interfaces/stores.interface';

@Injectable()
export class StoresService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor(
		@InjectModel(schemasName.store) private readonly _storeModel: Model<IStore>,
		private readonly _notificationService: NotificationService,
		private readonly _usersService: UsersService,
		private readonly _amazonFilesService: AmazonFilesService,
	) {
		this._logger = new Logger(StoresService.name);
	}

	// #endregion

	// #region Public Methods

	public async findById(storeId: string): Promise<IStore | undefined> {
		return this._storeModel.findById(storeId);
	}

	public async findByIdOrFail(storeId: string): Promise<IStore> {
		const store: IStore | undefined = await this.findById(storeId);

		if (!store) {
			throw new NotFoundException('User not found!');
		}

		return store;
	}

	public async findByUserId(userId: string): Promise<IStore[]> {
		const stores: IStore[] = await this._storeModel.find({ userId });

		return stores;
	}

	public async findOneByEmail(email: string): Promise<IStore | undefined> {
		return this._storeModel.findOne({ email });
	}

	public async create(
		file: Express.Multer.File,
		createStoreDto: CreateStoreDto,
		userId: string,
	): Promise<IStore> {
		const storeByEmail: IStore | undefined = await this.findOneByEmail(
			createStoreDto.email,
		);

		if (storeByEmail) {
			throw new BadRequestException('Invalid email, please try a new email.');
		}

		const user: IUser = await this._usersService.findOneByUserIdOrFail(userId);

		const response: ManagedUpload.SendData =
			await this._amazonFilesService.uploadFile(file);

		const store = new this._storeModel({
			name: createStoreDto.name,
			description: createStoreDto.description,
			logo: response.Key,
			startedAt: createStoreDto.startedAt,
			status: StoresEnum.Status.ACTIVE,
			userId,
			email: createStoreDto.email,
			addresses: [],
			phoneNumbers: [],
		});

		const newStore: IStore = await store.save();

		await this._notificationService.sendCreateStore(newStore, user);

		return store.save();
	}

	// #endregion
}
