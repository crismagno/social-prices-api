import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common';

import EmployeesEnum from '../employees/interfaces/employees.enum';
import QuickMessagesEnum from './interfaces/quick-messages.enum';
import { QuickMessagesService } from './quick-messages.service';

const OWNER = '507f1f77bcf86cd799439011';
const OTHER_OWNER = '507f1f77bcf86cd799439099';
const MSG = '507f1f77bcf86cd799439022';
const EMP = '507f1f77bcf86cd799439033';
const EMP2 = '507f1f77bcf86cd799439044';

const owner = { ownerUserId: OWNER, employeeId: null };
const asEmployee = { ownerUserId: OWNER, employeeId: EMP };

const file = (name: string, mimetype: string): any => ({
	originalname: name,
	mimetype,
	size: 10,
	buffer: Buffer.from('x'),
});

const text = (t: string): any => ({ type: 'TEXT', text: t });

const dto = (over: any = {}): any => ({
	name: 'Preço',
	allEmployees: true,
	employeesIds: [],
	blocks: [text('oi')],
	...over,
});

const stored = (over: any = {}): any => ({
	_id: MSG,
	ownerUserId: OWNER,
	name: 'Preço',
	allEmployees: true,
	employeesIds: [],
	usageCount: 0,
	softDelete: null,
	blocks: [
		{
			type: 'MEDIA',
			kind: 'IMAGE',
			fileKey: 'old-a.png',
			fileName: 'a.png',
			mimeType: 'image/png',
			size: 1,
			caption: null,
		},
		{
			type: 'MEDIA',
			kind: 'FILE',
			fileKey: 'old-b.pdf',
			fileName: 'b.pdf',
			mimeType: 'application/pdf',
			size: 1,
			caption: null,
		},
	],
	...over,
});

const build = () => {
	let uploads = 0;
	const lean = (value: any) => ({ lean: jest.fn().mockResolvedValue(value) });
	const model: any = {
		findOne: jest.fn().mockReturnValue(lean(null)),
		find: jest.fn().mockReturnValue(lean([])),
		create: jest.fn(async (doc: any) => ({ _id: MSG, ...doc })),
		findOneAndUpdate: jest.fn().mockReturnValue(lean(stored())),
		updateOne: jest.fn().mockResolvedValue({}),
		countDocuments: jest.fn().mockResolvedValue(0),
	};
	const files: any = {
		uploadFile: jest.fn(async (f: any) => ({
			Key: `key-${++uploads}-${f.originalname}`,
		})),
		deleteFile: jest.fn().mockResolvedValue({}),
	};
	const employees: any = {
		findById: jest.fn().mockResolvedValue(null),
		findByIds: jest.fn().mockResolvedValue([]),
	};

	return {
		model,
		files,
		employees,
		lean,
		service: new QuickMessagesService(model, files, employees),
	};
};

describe('QuickMessagesService', () => {
	describe('create', () => {
		it('rejects a name already used by a non-deleted message of the same owner', async () => {
			const { service, model, lean } = build();
			model.findOne.mockReturnValue(lean({ _id: 'x' }));

			await expect(service.create(owner, dto(), [])).rejects.toMatchObject({
				response: { code: QuickMessagesEnum.ErrorCode.NAME_TAKEN },
			});
			const filter = model.findOne.mock.calls[0][0];
			expect(filter.ownerUserId).toBe(OWNER);
			expect(filter['softDelete.isDeleted']).toEqual({ $ne: true });
		});

		it('uploads each referenced file once, stores its Key, kind from mimetype', async () => {
			const { service, model, files } = build();
			const upload = [
				file('a.png', 'image/png'),
				file('v.mp4', 'video/mp4'),
				file('s.mp3', 'audio/mpeg'),
				file('d.pdf', 'application/pdf'),
			];

			await service.create(
				owner,
				dto({
					blocks: [
						text('olá'),
						{ type: 'MEDIA', fileIndex: 0, caption: ' foto ' },
						{ type: 'MEDIA', fileIndex: 1 },
						{ type: 'MEDIA', fileIndex: 2 },
						{ type: 'MEDIA', fileIndex: 3 },
					],
				}),
				upload,
			);

			expect(files.uploadFile).toHaveBeenCalledTimes(4);
			const blocks = model.create.mock.calls[0][0].blocks;
			expect(blocks.map((b: any) => b.kind ?? b.type)).toEqual([
				'TEXT',
				'IMAGE',
				'VIDEO',
				'AUDIO',
				'FILE',
			]);
			expect(blocks[1]).toMatchObject({
				fileKey: 'key-1-a.png',
				fileName: 'a.png',
				mimeType: 'image/png',
				caption: 'foto',
			});
		});

		it('rejects a MEDIA block whose fileIndex has no file, without uploading', async () => {
			const { service, files } = build();

			await expect(
				service.create(
					owner,
					dto({ blocks: [{ type: 'MEDIA', fileIndex: 0 }] }),
					[],
				),
			).rejects.toBeInstanceOf(BadRequestException);
			expect(files.uploadFile).not.toHaveBeenCalled();
		});

		it('rejects a fileKey on create (it can only point at the message own files)', async () => {
			const { service } = build();

			await expect(
				service.create(
					owner,
					dto({ blocks: [{ type: 'MEDIA', fileKey: 'someone-else.png' }] }),
					[],
				),
			).rejects.toBeInstanceOf(BadRequestException);
		});

		it('rejects empty text, text or caption over 1000 chars, and more than 20 blocks', async () => {
			const { service } = build();
			const long = 'a'.repeat(1001);

			await expect(
				service.create(owner, dto({ blocks: [text('  ')] }), []),
			).rejects.toBeInstanceOf(BadRequestException);
			await expect(
				service.create(owner, dto({ blocks: [text(long)] }), []),
			).rejects.toBeInstanceOf(BadRequestException);
			await expect(
				service.create(
					owner,
					dto({ blocks: [{ type: 'MEDIA', fileIndex: 0, caption: long }] }),
					[file('a.png', 'image/png')],
				),
			).rejects.toBeInstanceOf(BadRequestException);
			await expect(
				service.create(
					owner,
					dto({ blocks: Array.from({ length: 21 }, () => text('a')) }),
					[],
				),
			).rejects.toBeInstanceOf(BadRequestException);
			await expect(
				service.create(owner, dto({ name: '  ' }), []),
			).rejects.toBeInstanceOf(BadRequestException);
		});

		it('rejects employeesIds not belonging to the owner', async () => {
			const { service, employees } = build();
			employees.findByIds.mockResolvedValue([
				{ _id: EMP, userId: OTHER_OWNER },
			]);

			await expect(
				service.create(
					owner,
					dto({ allEmployees: false, employeesIds: [EMP] }),
					[],
				),
			).rejects.toBeInstanceOf(BadRequestException);
		});

		it('deletes the uploaded files when saving fails', async () => {
			const { service, model, files } = build();
			model.create.mockRejectedValue(new Error('db down'));

			await expect(
				service.create(
					owner,
					dto({ blocks: [{ type: 'MEDIA', fileIndex: 0 }] }),
					[file('a.png', 'image/png')],
				),
			).rejects.toThrow('db down');
			expect(files.deleteFile).toHaveBeenCalledWith('key-1-a.png');
		});
	});

	describe('update', () => {
		it('keeps kept files, uploads new ones and deletes the removed ones after saving', async () => {
			const { service, model, files, lean } = build();
			model.findOne
				.mockReturnValueOnce(lean(stored())) // the message
				.mockReturnValueOnce(lean(null)); // name check

			await service.update(
				owner,
				MSG,
				dto({
					blocks: [
						{ type: 'MEDIA', fileKey: 'old-a.png', caption: 'x' },
						{ type: 'MEDIA', fileIndex: 0 },
					],
				}),
				[file('c.png', 'image/png')],
			);

			const update = model.findOneAndUpdate.mock.calls[0][1].$set;
			expect(update.blocks[0]).toMatchObject({
				fileKey: 'old-a.png',
				fileName: 'a.png',
				caption: 'x',
			});
			expect(update.blocks[1]).toMatchObject({ fileKey: 'key-1-c.png' });
			expect(files.deleteFile).toHaveBeenCalledTimes(1);
			expect(files.deleteFile).toHaveBeenCalledWith('old-b.pdf');
		});

		it('rejects a fileKey that is not one of the message current files', async () => {
			const { service, model, lean } = build();
			model.findOne
				.mockReturnValueOnce(lean(stored()))
				.mockReturnValueOnce(lean(null));

			await expect(
				service.update(
					owner,
					MSG,
					dto({ blocks: [{ type: 'MEDIA', fileKey: 'other.png' }] }),
					[],
				),
			).rejects.toBeInstanceOf(BadRequestException);
		});

		it('is 404 for a message of another owner or deleted', async () => {
			const { service } = build();

			await expect(
				service.update(owner, MSG, dto(), []),
			).rejects.toBeInstanceOf(NotFoundException);
		});
	});

	describe('activateManual', () => {
		it('refuses when another active message took the name meanwhile', async () => {
			const { service, model, lean } = build();
			model.findOne
				.mockReturnValueOnce(lean(stored({ softDelete: { isDeleted: true } })))
				.mockReturnValueOnce(lean({ _id: 'other' }));

			await expect(service.activateManual(owner, MSG)).rejects.toBeInstanceOf(
				ConflictException,
			);
		});
	});

	describe('assertCanUse', () => {
		it('lets the owner through', async () => {
			const { service } = build();

			await expect(
				service.assertCanUse(owner, stored({ allEmployees: false })),
			).resolves.toBeUndefined();
		});

		it('lets ADMIN and MASTER through even when not listed', async () => {
			const { service, employees } = build();

			for (const level of [
				EmployeesEnum.Level.ADMIN,
				EmployeesEnum.Level.MASTER,
			]) {
				employees.findById.mockResolvedValue({
					_id: EMP,
					userId: OWNER,
					level,
				});
				await expect(
					service.assertCanUse(asEmployee, stored({ allEmployees: false })),
				).resolves.toBeUndefined();
			}
		});

		it('EMPLOYEE: passes with allEmployees, passes when listed, fails otherwise', async () => {
			const { service, employees } = build();
			employees.findById.mockResolvedValue({
				_id: EMP,
				userId: OWNER,
				level: EmployeesEnum.Level.EMPLOYEE,
			});

			await expect(
				service.assertCanUse(asEmployee, stored()),
			).resolves.toBeUndefined();
			await expect(
				service.assertCanUse(
					asEmployee,
					stored({ allEmployees: false, employeesIds: [EMP] }),
				),
			).resolves.toBeUndefined();
			await expect(
				service.assertCanUse(
					asEmployee,
					stored({ allEmployees: false, employeesIds: [EMP2] }),
				),
			).rejects.toBeInstanceOf(ForbiddenException);
		});
	});

	describe('listAvailable', () => {
		it('for an EMPLOYEE, asks only usable, non-deleted messages and hides file keys', async () => {
			const { service, model, employees, lean } = build();
			employees.findById.mockResolvedValue({
				_id: EMP,
				userId: OWNER,
				level: EmployeesEnum.Level.EMPLOYEE,
			});
			model.find.mockReturnValue(lean([stored()]));

			const result = await service.listAvailable(asEmployee);

			const [filter, , options] = model.find.mock.calls[0];
			expect(filter).toMatchObject({
				ownerUserId: OWNER,
				'softDelete.isDeleted': { $ne: true },
				$or: [{ allEmployees: true }, { employeesIds: EMP }],
			});
			expect(options.sort).toEqual({ usageCount: -1, name: 1 });
			expect(JSON.stringify(result)).not.toContain('fileKey');
			expect(result[0].blocks[0]).toMatchObject({
				fileName: 'a.png',
				kind: 'IMAGE',
			});
		});

		it('for the owner, does not restrict by employee', async () => {
			const { service, model } = build();

			await service.listAvailable(owner);

			expect(model.find.mock.calls[0][0]).not.toHaveProperty('$or');
		});
	});
});
