import { ManagedUpload } from 'aws-sdk/clients/s3';
import { FilterQuery, Model, Types, UpdateQuery } from 'mongoose';

import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { AmazonFilesService } from '../../infra/services/amazon/amazon-files-service';
import { queryOptions } from '../../shared/helpers/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/helpers/table/table-state.interface';
import { NotificationService } from '../notification/notification.service';
import { IUser } from '../users/interfaces/user.interface';
import { UsersService } from '../users/users.service';
import CreateStoreDto from './interfaces/dto/createStore.dto';
import UpdateStoreDto from './interfaces/dto/updateStore.dto';
import { IStore } from './interfaces/store.interface';
import StoresEnum from './interfaces/stores.enum';

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
			throw new NotFoundException('Store not found!');
		}

		return store;
	}

	public async findByUserId(userId: string): Promise<IStore[]> {
		const stores: IStore[] = await this._storeModel.find({ userId });

		return stores;
	}

	public async findByUserTableState(
		userId: string,
		tableState: ITableStateRequest<IStore>,
	): Promise<ITableStateResponse<IStore[]>> {
		const filter: FilterQuery<IStore> = {
			userId,
		};

		if (tableState.search) {
			const search = new RegExp(tableState.search, 'ig');

			filter.$or = [
				{
					name: search,
				},
				{
					email: search,
				},
			];
		}

		if (tableState?.filters?.status) {
			filter.status = { $in: tableState.filters.status as StoresEnum.Status };
		}

		const response: ITableStateResponse<IStore[]> = {
			data: [],
			total: 0,
		};

		response.total = await this._storeModel.countDocuments(filter);
		response.data = await this._storeModel.find(
			filter,
			null,
			queryOptions<IStore>(tableState),
		);

		return response;
	}

	public async findOneByEmail(email: string): Promise<IStore | undefined> {
		return this._storeModel.findOne({ email });
	}

	public async findOneByName(name: string): Promise<IStore | undefined> {
		return this._storeModel.findOne({ name });
	}

	public async findOneByNameOrEmail(
		name: string,
		email: string,
	): Promise<IStore | undefined> {
		return this._storeModel.findOne({
			$or: [{ name }, { email }],
		});
	}

	public async create(
		file: Express.Multer.File,
		createStoreDto: CreateStoreDto,
		userId: string,
	): Promise<IStore> {
		const storeByNameOrEmail: IStore | undefined =
			await this.findOneByNameOrEmail(
				createStoreDto.name,
				createStoreDto.email,
			);

		if (storeByNameOrEmail?.name === createStoreDto.name) {
			throw new BadRequestException('Invalid name, please try a new name.');
		}

		if (storeByNameOrEmail?.email === createStoreDto.email) {
			throw new BadRequestException('Invalid email, please try a new email.');
		}

		const user: IUser = await this._usersService.findOneByUserIdOrFail(userId);

		const responseFile: ManagedUpload.SendData =
			await this._amazonFilesService.uploadFile(file);

		if (typeof createStoreDto.addresses === 'string') {
			createStoreDto.addresses = JSON.parse(createStoreDto.addresses);
		}

		if (typeof createStoreDto.phoneNumbers === 'string') {
			createStoreDto.phoneNumbers = JSON.parse(createStoreDto.phoneNumbers);
		}

		const store = new this._storeModel({
			logo: responseFile.Key,
			status: createStoreDto.status,
			userId,
			addresses: createStoreDto.addresses,
			phoneNumbers: createStoreDto.phoneNumbers,
			name: createStoreDto.name,
			email: createStoreDto.email,
			description: createStoreDto.description,
			startedAt: createStoreDto.startedAt,
			about: createStoreDto.about,
		});

		const newStore: IStore = await store.save();

		await this._notificationService.sendCreateStore(newStore, user);

		return newStore;
	}

	public async update(
		file: Express.Multer.File,
		updateStoreDto: UpdateStoreDto,
	): Promise<IStore> {
		const store: IStore = await this.findByIdOrFail(updateStoreDto.storeId);

		if (store?.email !== updateStoreDto.email) {
			const storeByEmail: IStore | undefined = await this.findOneByEmail(
				updateStoreDto.email,
			);

			if (storeByEmail?.email === updateStoreDto.email) {
				throw new BadRequestException('Invalid email, please try a new email.');
			}
		}

		if (store?.name !== updateStoreDto.name) {
			const storeByName: IStore | undefined = await this.findOneByName(
				updateStoreDto.name,
			);

			if (storeByName?.name === updateStoreDto.name) {
				throw new BadRequestException('Invalid name, please try a new name.');
			}
		}

		if (typeof updateStoreDto.addresses === 'string') {
			updateStoreDto.addresses = JSON.parse(updateStoreDto.addresses);
		}

		if (typeof updateStoreDto.phoneNumbers === 'string') {
			updateStoreDto.phoneNumbers = JSON.parse(updateStoreDto.phoneNumbers);
		}

		const user: IUser = await this._usersService.findOneByUserIdOrFail(
			store.userId.toString(),
		);

		const $set: UpdateQuery<IStore> = {
			addresses: updateStoreDto.addresses,
			phoneNumbers: updateStoreDto.phoneNumbers,
			name: updateStoreDto.name,
			email: updateStoreDto.email,
			description: updateStoreDto.description,
			startedAt: updateStoreDto.startedAt,
			about: updateStoreDto.about,
			status: updateStoreDto.status,
		};

		let responseFile: ManagedUpload.SendData | null = null;

		if (file) {
			responseFile = await this._amazonFilesService.uploadFile(file);
			$set.logo = responseFile.Key;
		}

		const updatedStore: IStore = await this._storeModel.findOneAndUpdate(
			new Types.ObjectId(updateStoreDto.storeId),
			{
				$set,
			},
			{
				new: true,
			},
		);

		await this._notificationService.sendUpdateStore(updatedStore, user);

		return updatedStore;
	}

	// #endregion
}
