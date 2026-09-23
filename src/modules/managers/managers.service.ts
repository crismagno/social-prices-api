import mongoose, { FilterQuery, Model, Types } from 'mongoose';

import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import HashCrypt from '../../infra/hash-crypt/hash-crypt';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { canManage } from './interfaces/can-manage';
import CreateManagerDto from './interfaces/dto/createManager.dto';
import UpdateManagerDto from './interfaces/dto/updateManager.dto';
import ManagerEntity from './interfaces/manager.entity';
import { IManager } from './interfaces/manager.interface';
import ManagersEnum from './interfaces/managers.enum';
import {
	IManagerActor,
	IManagerEntity,
	IManagersTableFilters,
} from './interfaces/managers.types';

@Injectable()
export class ManagersService {
	//#region Private Properties

	private readonly _logger: Logger;

	//#endregion

	//#region Constructor

	constructor(
		@InjectModel(schemasName.manager)
		private readonly _managerModel: Model<IManager>,
		private readonly _hashCrypt: HashCrypt,
		private readonly _notificationsService: NotificationsService,
	) {
		this._logger = new Logger(ManagersService.name);
	}

	//#endregion

	// #region Public Methods - Read

	/**
	 * Returns the raw document, password hash included. Never expose this directly
	 * through a controller.
	 */
	public async findById(managerId: string): Promise<IManager | null> {
		return await this._managerModel.findById(managerId);
	}

	/**
	 * Returns the raw document, password hash included. Never expose this directly
	 * through a controller.
	 */
	public async findByIdOrFail(managerId: string): Promise<IManager> {
		const manager: IManager = await this.findById(managerId);

		if (!manager) {
			throw new NotFoundException('Manager not found!');
		}

		return manager;
	}

	/**
	 * Authorized single read: same lookup as findByIdOrFail, but refuses unless the
	 * actor is reading their own record or canManage(actor.level, target.level).
	 * Returns the raw document, password hash included, like its neighbours here —
	 * never expose this directly through a controller.
	 */
	public async findByIdForActor(
		actor: IManagerActor,
		managerId: string,
	): Promise<IManager> {
		const target: IManager = await this.findByIdOrFail(managerId);

		const isSelf: boolean = actor._id === target._id.toString();

		if (!isSelf && !canManage(actor.level, target.level)) {
			throw new ForbiddenException('You cannot manage this manager.');
		}

		return target;
	}

	/**
	 * Returns the raw document, password hash included. Never expose this directly
	 * through a controller.
	 */
	public async findOneByEmail(email: string): Promise<IManager | undefined> {
		return await this._managerModel.findOne({ email });
	}

	/**
	 * Returns the raw document, password hash included. Never expose this directly
	 * through a controller.
	 */
	public async findMain(): Promise<IManager | null> {
		return await this._managerModel.findOne({ isMain: true });
	}

	public async findByTableState(
		tableState: ITableStateRequest<IManager>,
	): Promise<ITableStateResponse<IManagerEntity[]>> {
		const filters: IManagersTableFilters = tableState?.filters ?? {};

		const filter: FilterQuery<IManager> = filters.isDeleted
			? { 'softDelete.isDeleted': true }
			: { 'softDelete.isDeleted': { $ne: true } };

		if (tableState?.search) {
			const search = new RegExp(tableState.search, 'ig');

			filter.$or = [{ name: search }, { email: search }];
		}

		if (filters.level?.length) {
			filter.level = { $in: filters.level };
		}

		if (filters.isActive?.length) {
			filter.isActive = { $in: filters.isActive };
		}

		const total: number = await this._managerModel.countDocuments(filter);

		const managers: IManager[] = await this._managerModel.find(
			filter,
			null,
			queryOptions<IManager>(tableState),
		);

		return {
			total,
			data: managers.map((manager: IManager) => new ManagerEntity(manager)),
		};
	}

	// #endregion

	// #region Public Methods - Write

	public async create(
		actor: IManagerActor,
		createManagerDto: CreateManagerDto,
	): Promise<IManagerEntity> {
		if (!canManage(actor.level, createManagerDto.level)) {
			throw new ForbiddenException(
				'You cannot create a manager at this level.',
			);
		}

		const findByEmail: IManager = await this._managerModel.findOne({
			email: createManagerDto.email,
		});

		if (findByEmail) {
			throw new BadRequestException(
				'There is already a manager with this email.',
			);
		}

		const hashPassword: string = await this._hashCrypt.generateHash(
			createManagerDto.password,
		);

		const newManager = new this._managerModel({
			name: createManagerDto.name,
			email: createManagerDto.email,
			password: hashPassword,
			birthDate: createManagerDto.birthDate ?? null,
			level: createManagerDto.level,
			isActive: true,
			isMain: false,
			createdByManagerId: new mongoose.Types.ObjectId(actor._id),
			softDelete: null,
		});

		const manager: IManager = await newManager.save();

		await this._notificationsService.sendManagerCreatedCredentials(
			manager,
			createManagerDto.password,
		);

		return new ManagerEntity(manager);
	}

	public async update(
		actor: IManagerActor,
		updateManagerDto: UpdateManagerDto,
	): Promise<IManagerEntity> {
		const target: IManager = await this.findByIdOrFail(updateManagerDto._id);

		const isSelf: boolean = actor._id === target._id.toString();

		const isChangingLevel: boolean = updateManagerDto.level !== target.level;

		const isChangingIsActive: boolean =
			updateManagerDto.isActive !== target.isActive;

		if (isSelf) {
			if (isChangingLevel) {
				throw new ForbiddenException('You cannot change your own level.');
			}

			if (isChangingIsActive) {
				throw new ForbiddenException(
					'You cannot change your own active state.',
				);
			}
		} else {
			if (!canManage(actor.level, target.level)) {
				throw new ForbiddenException('You cannot manage this manager.');
			}

			if (isChangingLevel && !canManage(actor.level, updateManagerDto.level)) {
				throw new ForbiddenException(
					'You cannot move a manager to this level.',
				);
			}
		}

		if (target.isMain && isChangingLevel) {
			throw new ForbiddenException('The main manager level cannot change.');
		}

		if (target.isMain && isChangingIsActive) {
			throw new ForbiddenException('The main manager cannot be deactivated.');
		}

		const updated: IManager = await this._managerModel.findOneAndUpdate(
			new Types.ObjectId(target._id),
			{
				$set: {
					name: updateManagerDto.name,
					birthDate: updateManagerDto.birthDate ?? null,
					level: updateManagerDto.level,
					isActive: updateManagerDto.isActive,
					updatedAt: new Date(),
				},
			},
			{ new: true },
		);

		return new ManagerEntity(updated);
	}

	public async deleteManual(
		actor: IManagerActor,
		managerId: string,
		reason: string | null,
	): Promise<IManagerEntity> {
		const target: IManager = await this.findByIdOrFail(managerId);

		if (target.isMain) {
			throw new ForbiddenException('The main manager cannot be deleted.');
		}

		if (actor._id === target._id.toString()) {
			throw new ForbiddenException('You cannot delete your own account.');
		}

		if (!canManage(actor.level, target.level)) {
			throw new ForbiddenException('You cannot manage this manager.');
		}

		const deleted: IManager = await this._managerModel.findOneAndUpdate(
			new Types.ObjectId(target._id),
			{
				$set: {
					softDelete: {
						isDeleted: true,
						deletedAt: new Date(),
						deletedByUserId: null,
						deletedByEmployeeId: null,
						deletedByManagerId: new mongoose.Types.ObjectId(actor._id),
						reason,
					},
					updatedAt: new Date(),
				},
			},
			{ new: true },
		);

		return new ManagerEntity(deleted);
	}

	public async activateManual(
		actor: IManagerActor,
		managerId: string,
	): Promise<IManagerEntity> {
		const target: IManager = await this.findByIdOrFail(managerId);

		// Defence in depth: ManagerLevelGuard already refuses a deleted actor, but a
		// manager must never be able to undo their own removal.
		if (actor._id === target._id.toString()) {
			throw new ForbiddenException('You cannot restore your own account.');
		}

		if (!canManage(actor.level, target.level)) {
			throw new ForbiddenException('You cannot manage this manager.');
		}

		const restored: IManager = await this._managerModel.findOneAndUpdate(
			new Types.ObjectId(target._id),
			{
				$set: {
					softDelete: null,
					updatedAt: new Date(),
				},
			},
			{ new: true },
		);

		return new ManagerEntity(restored);
	}

	public async updatePassword(
		managerId: string,
		newPassword: string,
	): Promise<void> {
		const hashPassword: string =
			await this._hashCrypt.generateHash(newPassword);

		await this._managerModel.findOneAndUpdate(new Types.ObjectId(managerId), {
			$set: {
				password: hashPassword,
				updatedAt: new Date(),
			},
		});
	}

	/**
	 * Only for the seed script. The main manager is never created through the panel:
	 * it has isMain true, which makes it undeletable and undowngradable.
	 */
	public async createMain(params: {
		name: string;
		email: string;
		password: string;
		birthDate: Date | null;
	}): Promise<IManager> {
		const hashPassword: string = await this._hashCrypt.generateHash(
			params.password,
		);

		const newManager = new this._managerModel({
			name: params.name,
			email: params.email,
			password: hashPassword,
			birthDate: params.birthDate,
			level: ManagersEnum.Level.ADMIN,
			isActive: true,
			isMain: true,
			createdByManagerId: null,
			softDelete: null,
		});

		return await newManager.save();
	}

	// #endregion
}
