import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { ManagersService } from './managers.service';
import ManagersEnum from './interfaces/managers.enum';

const ADMIN_ID: string = '507f1f77bcf86cd799439021';
const MANAGER_ID: string = '507f1f77bcf86cd799439022';
const SUB_MANAGER_ID: string = '507f1f77bcf86cd799439023';
const MAIN_ID: string = '507f1f77bcf86cd799439024';

const buildManager = (overrides: any = {}): any => ({
	_id: SUB_MANAGER_ID,
	name: 'Target',
	email: 'target@test.com',
	password: 'hashed',
	birthDate: null,
	level: ManagersEnum.Level.SUB_MANAGER,
	isActive: true,
	isMain: false,
	createdByManagerId: null,
	softDelete: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	...overrides,
});

const buildManagerModelMock = (): any => {
	const ManagerModelMock: any = function (this: any, doc: any) {
		Object.assign(this, doc);

		ManagerModelMock.lastCreatedDoc = doc;

		this.save = jest.fn().mockResolvedValue(buildManager(doc));
	};

	ManagerModelMock.findOne = jest.fn();
	ManagerModelMock.findById = jest.fn();
	ManagerModelMock.findOneAndUpdate = jest.fn();
	ManagerModelMock.countDocuments = jest.fn();
	ManagerModelMock.find = jest.fn();
	ManagerModelMock.lastCreatedDoc = null;

	return ManagerModelMock;
};

describe('ManagersService', () => {
	let managerModelMock: any;
	let hashCryptMock: any;
	let notificationsServiceMock: any;
	let service: ManagersService;

	const admin: any = { _id: ADMIN_ID, level: ManagersEnum.Level.ADMIN };
	const manager: any = { _id: MANAGER_ID, level: ManagersEnum.Level.MANAGER };
	const subManager: any = {
		_id: SUB_MANAGER_ID,
		level: ManagersEnum.Level.SUB_MANAGER,
	};

	beforeEach(() => {
		managerModelMock = buildManagerModelMock();

		hashCryptMock = { generateHash: jest.fn().mockResolvedValue('hashed') };

		notificationsServiceMock = {
			sendManagerCreatedCredentials: jest
				.fn()
				.mockResolvedValue({ email: 'sent' }),
		};

		service = new ManagersService(
			managerModelMock,
			hashCryptMock,
			notificationsServiceMock,
		);
	});

	describe('create', () => {
		it('lets a MANAGER create a SUB_MANAGER and emails the credentials', async () => {
			managerModelMock.findOne.mockResolvedValue(undefined);

			const created = await service.create(manager, {
				name: 'New One',
				email: 'new@test.com',
				password: 'secret123',
				birthDate: null,
				level: ManagersEnum.Level.SUB_MANAGER,
			});

			expect(created.email).toBe('new@test.com');
			expect(created.isMain).toBe(false);
			expect(JSON.stringify(created)).not.toContain('hashed');
			expect(hashCryptMock.generateHash).toHaveBeenCalledWith('secret123');
			expect(
				notificationsServiceMock.sendManagerCreatedCredentials,
			).toHaveBeenCalledWith(expect.anything(), 'secret123');
		});

		it('never stores the raw password', async () => {
			managerModelMock.findOne.mockResolvedValue(undefined);

			await service.create(admin, {
				name: 'New One',
				email: 'new@test.com',
				password: 'secret123',
				birthDate: null,
				level: ManagersEnum.Level.SUB_MANAGER,
			});

			expect(managerModelMock.lastCreatedDoc.password).toBe('hashed');
		});

		it('refuses a MANAGER creating an ADMIN', async () => {
			await expect(
				service.create(manager, {
					name: 'New One',
					email: 'new@test.com',
					password: 'secret123',
					birthDate: null,
					level: ManagersEnum.Level.ADMIN,
				}),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('refuses a duplicated email', async () => {
			managerModelMock.findOne.mockResolvedValue(buildManager());

			await expect(
				service.create(admin, {
					name: 'New One',
					email: 'target@test.com',
					password: 'secret123',
					birthDate: null,
					level: ManagersEnum.Level.SUB_MANAGER,
				}),
			).rejects.toBeInstanceOf(BadRequestException);
		});
	});

	describe('findByIdForActor', () => {
		it('lets a SUB_MANAGER read their own record', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({ _id: SUB_MANAGER_ID }),
			);

			const found = await service.findByIdForActor(subManager, SUB_MANAGER_ID);

			expect(found._id).toBe(SUB_MANAGER_ID);
		});

		it('refuses a MANAGER reading an ADMIN', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({ _id: ADMIN_ID, level: ManagersEnum.Level.ADMIN }),
			);

			await expect(
				service.findByIdForActor(manager, ADMIN_ID),
			).rejects.toBeInstanceOf(ForbiddenException);
		});
	});

	describe('update', () => {
		it('refuses downgrading the main manager, even for an ADMIN', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({
					_id: MAIN_ID,
					isMain: true,
					level: ManagersEnum.Level.ADMIN,
				}),
			);

			await expect(
				service.update(admin, {
					_id: MAIN_ID,
					name: 'Main',
					birthDate: null,
					level: ManagersEnum.Level.MANAGER,
					isActive: true,
				}),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('refuses deactivating the main manager, even for an ADMIN', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({
					_id: MAIN_ID,
					isMain: true,
					level: ManagersEnum.Level.ADMIN,
				}),
			);

			await expect(
				service.update(admin, {
					_id: MAIN_ID,
					name: 'Main',
					birthDate: null,
					level: ManagersEnum.Level.ADMIN,
					isActive: false,
				}),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('lets a SUB_MANAGER edit their own name', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({ _id: SUB_MANAGER_ID }),
			);
			managerModelMock.findOneAndUpdate.mockResolvedValue(
				buildManager({ _id: SUB_MANAGER_ID, name: 'New Name' }),
			);

			const updated = await service.update(subManager, {
				_id: SUB_MANAGER_ID,
				name: 'New Name',
				birthDate: null,
				level: ManagersEnum.Level.SUB_MANAGER,
				isActive: true,
			});

			expect(updated.name).toBe('New Name');
		});

		it('refuses a SUB_MANAGER changing their own level', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({ _id: SUB_MANAGER_ID }),
			);

			await expect(
				service.update(subManager, {
					_id: SUB_MANAGER_ID,
					name: 'Target',
					birthDate: null,
					level: ManagersEnum.Level.ADMIN,
					isActive: true,
				}),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('refuses a MANAGER editing an ADMIN', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({ _id: ADMIN_ID, level: ManagersEnum.Level.ADMIN }),
			);

			await expect(
				service.update(manager, {
					_id: ADMIN_ID,
					name: 'Some Admin',
					birthDate: null,
					level: ManagersEnum.Level.ADMIN,
					isActive: true,
				}),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('refuses an ADMIN deactivating their own account', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({
					_id: ADMIN_ID,
					level: ManagersEnum.Level.ADMIN,
					isMain: false,
				}),
			);

			await expect(
				service.update(admin, {
					_id: ADMIN_ID,
					name: 'Some Admin',
					birthDate: null,
					level: ManagersEnum.Level.ADMIN,
					isActive: false,
				}),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('refuses a MANAGER moving a SUB_MANAGER to MANAGER level', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({ _id: SUB_MANAGER_ID }),
			);

			await expect(
				service.update(manager, {
					_id: SUB_MANAGER_ID,
					name: 'Target',
					birthDate: null,
					level: ManagersEnum.Level.MANAGER,
					isActive: true,
				}),
			).rejects.toBeInstanceOf(ForbiddenException);
		});
	});

	describe('deleteManual', () => {
		it('refuses deleting the main manager', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({
					_id: MAIN_ID,
					isMain: true,
					level: ManagersEnum.Level.ADMIN,
				}),
			);

			await expect(
				service.deleteManual(admin, MAIN_ID, null),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('refuses deleting your own account', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({ _id: SUB_MANAGER_ID }),
			);

			await expect(
				service.deleteManual(subManager, SUB_MANAGER_ID, null),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('refuses an ADMIN deleting their own account', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({
					_id: ADMIN_ID,
					level: ManagersEnum.Level.ADMIN,
					isMain: false,
				}),
			);

			await expect(
				service.deleteManual(admin, ADMIN_ID, null),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('refuses a MANAGER deleting an ADMIN', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({ _id: ADMIN_ID, level: ManagersEnum.Level.ADMIN }),
			);

			await expect(
				service.deleteManual(manager, ADMIN_ID, null),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('lets a MANAGER soft delete a SUB_MANAGER with a reason', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({ _id: SUB_MANAGER_ID }),
			);
			managerModelMock.findOneAndUpdate.mockResolvedValue(
				buildManager({
					_id: SUB_MANAGER_ID,
					isActive: false,
					softDelete: { isDeleted: true },
				}),
			);

			const deleted = await service.deleteManual(
				manager,
				SUB_MANAGER_ID,
				'left the company',
			);

			expect(deleted.isDeleted).toBe(true);

			const update: any = managerModelMock.findOneAndUpdate.mock.calls[0][1];

			expect(update.$set.softDelete.reason).toBe('left the company');
			expect(update.$set.softDelete.deletedByManagerId.toString()).toBe(
				MANAGER_ID,
			);
		});
	});

	describe('findByTableState', () => {
		it('never serialises a password hash for any row', async () => {
			managerModelMock.countDocuments.mockResolvedValue(2);
			managerModelMock.find.mockResolvedValue([
				buildManager({ _id: ADMIN_ID, level: ManagersEnum.Level.ADMIN }),
				buildManager({ _id: SUB_MANAGER_ID }),
			]);

			const result = await service.findByTableState({} as any);

			expect(result.data).toHaveLength(2);
			expect(JSON.stringify(result)).not.toContain('hashed');
		});
	});

	describe('activateManual', () => {
		it('refuses restoring your own account, even for an ADMIN', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({
					_id: ADMIN_ID,
					level: ManagersEnum.Level.ADMIN,
					softDelete: { isDeleted: true },
				}),
			);

			await expect(
				service.activateManual(admin, ADMIN_ID),
			).rejects.toBeInstanceOf(ForbiddenException);

			expect(managerModelMock.findOneAndUpdate).not.toHaveBeenCalled();
		});

		it('refuses a MANAGER restoring an ADMIN', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({
					_id: ADMIN_ID,
					level: ManagersEnum.Level.ADMIN,
					softDelete: { isDeleted: true },
				}),
			);

			await expect(
				service.activateManual(manager, ADMIN_ID),
			).rejects.toBeInstanceOf(ForbiddenException);
		});

		it('lets an ADMIN restore another manager', async () => {
			managerModelMock.findById.mockResolvedValue(
				buildManager({
					_id: SUB_MANAGER_ID,
					softDelete: { isDeleted: true },
				}),
			);
			managerModelMock.findOneAndUpdate.mockResolvedValue(
				buildManager({ _id: SUB_MANAGER_ID }),
			);

			const restored = await service.activateManual(admin, SUB_MANAGER_ID);

			expect(restored.isDeleted).toBe(false);

			const update: any = managerModelMock.findOneAndUpdate.mock.calls[0][1];

			expect(update.$set.softDelete).toBeNull();
		});
	});
});
