import * as moment from 'moment';

import { BadRequestException } from '@nestjs/common';

import { CodesService } from './codes.service';
import CodesEnum from './interfaces/codes.enum';

const USER_ID: string = '507f1f77bcf86cd799439011';
const EMPLOYEE_ID: string = '507f1f77bcf86cd799439012';
const CODE_ID: string = '507f1f77bcf86cd799439013';
const MANAGER_ID: string = '507f1f77bcf86cd799439014';

export const buildCodeModelMock = (): any => {
	const CodeModelMock: any = function (this: any, doc: any) {
		Object.assign(this, doc);

		CodeModelMock.lastCreatedDoc = doc;

		this.save = jest.fn().mockResolvedValue({ _id: CODE_ID, ...doc });
	};

	CodeModelMock.findOne = jest.fn();
	CodeModelMock.findOneAndUpdate = jest.fn();
	CodeModelMock.lastCreatedDoc = null;

	return CodeModelMock;
};

describe('CodesService', () => {
	let codeModelMock: any;
	let service: CodesService;

	beforeEach(() => {
		process.env.CODE_EXPIRES_IN_DAYS = '1';
		process.env.CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

		codeModelMock = buildCodeModelMock();
		service = new CodesService(codeModelMock);
	});

	describe('createSignIn', () => {
		it('creates a code scoped to the user when none exists', async () => {
			codeModelMock.findOne.mockResolvedValue(undefined);

			const code = await service.createSignIn(USER_ID);

			expect(codeModelMock.findOne).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: USER_ID,
					type: CodesEnum.Type.SIGN_IN,
					employeeId: null,
				}),
			);
			expect(codeModelMock.lastCreatedDoc.userId).toBe(USER_ID);
			expect(codeModelMock.lastCreatedDoc.type).toBe(CodesEnum.Type.SIGN_IN);
			expect(codeModelMock.lastCreatedDoc.employeeId).toBeNull();
			expect(code._id).toBe(CODE_ID);
		});

		it('returns the existing code while it has not expired', async () => {
			const existing: any = {
				_id: CODE_ID,
				value: 'OLDVAL',
				expiresIn: moment().add(1, 'day').toDate(),
			};

			codeModelMock.findOne.mockResolvedValue(existing);

			const code = await service.createSignIn(USER_ID);

			expect(code).toBe(existing);
			expect(codeModelMock.findOneAndUpdate).not.toHaveBeenCalled();
		});

		it('rotates value and expiry when the existing code has expired', async () => {
			codeModelMock.findOne.mockResolvedValue({
				_id: CODE_ID,
				value: 'OLDVAL',
				expiresIn: moment().subtract(1, 'day').toDate(),
			});
			codeModelMock.findOneAndUpdate.mockResolvedValue({ _id: CODE_ID });

			await service.createSignIn(USER_ID);

			const update: any = codeModelMock.findOneAndUpdate.mock.calls[0][1];

			expect(update.$set.value).not.toBe('OLDVAL');
			expect(moment(update.$set.expiresIn).isAfter(moment())).toBe(true);
		});
	});

	describe('validateSignIn', () => {
		it('returns true and rotates the code when the value matches', async () => {
			codeModelMock.findOne.mockResolvedValue({
				_id: CODE_ID,
				value: 'MATCH1',
				expiresIn: moment().add(1, 'day').toDate(),
			});
			codeModelMock.findOneAndUpdate.mockResolvedValue({ _id: CODE_ID });

			await expect(service.validateSignIn(USER_ID, 'MATCH1')).resolves.toBe(
				true,
			);
			expect(codeModelMock.findOneAndUpdate).toHaveBeenCalled();
		});

		it('returns false when the value does not match', async () => {
			codeModelMock.findOne.mockResolvedValue({
				_id: CODE_ID,
				value: 'MATCH1',
				expiresIn: moment().add(1, 'day').toDate(),
			});

			await expect(service.validateSignIn(USER_ID, 'WRONG1')).resolves.toBe(
				false,
			);
			expect(codeModelMock.findOneAndUpdate).not.toHaveBeenCalled();
		});

		it('throws BadRequestException when the code has expired', async () => {
			codeModelMock.findOne.mockResolvedValue({
				_id: CODE_ID,
				value: 'MATCH1',
				expiresIn: moment().subtract(1, 'day').toDate(),
			});

			await expect(
				service.validateSignIn(USER_ID, 'MATCH1'),
			).rejects.toBeInstanceOf(BadRequestException);
		});
	});

	describe('createSignInEmployee', () => {
		it('scopes the code by employeeId so it cannot collide with the user code', async () => {
			codeModelMock.findOne.mockResolvedValue(undefined);

			await service.createSignInEmployee(USER_ID, EMPLOYEE_ID);

			expect(codeModelMock.findOne).toHaveBeenCalledWith(
				expect.objectContaining({
					userId: USER_ID,
					type: CodesEnum.Type.SIGN_IN_EMPLOYEE,
					employeeId: EMPLOYEE_ID,
				}),
			);
			expect(codeModelMock.lastCreatedDoc.employeeId).toBe(EMPLOYEE_ID);
		});
	});

	describe('createManagerSignIn', () => {
		it('scopes the code by managerId, with no user attached', async () => {
			codeModelMock.findOne.mockResolvedValue(undefined);

			await service.createManagerSignIn(MANAGER_ID);

			expect(codeModelMock.findOne).toHaveBeenCalledWith({
				userId: null,
				employeeId: null,
				managerId: MANAGER_ID,
				type: CodesEnum.Type.MANAGER_SIGN_IN,
			});
			expect(codeModelMock.lastCreatedDoc.managerId).toBe(MANAGER_ID);
			expect(codeModelMock.lastCreatedDoc.userId).toBeNull();
		});
	});

	describe('validateManagerRecoverPassword', () => {
		it('returns true when the manager recover code matches', async () => {
			codeModelMock.findOne.mockResolvedValue({
				_id: CODE_ID,
				value: 'MATCH1',
				expiresIn: moment().add(1, 'day').toDate(),
			});
			codeModelMock.findOneAndUpdate.mockResolvedValue({ _id: CODE_ID });

			await expect(
				service.validateManagerRecoverPassword(MANAGER_ID, 'MATCH1'),
			).resolves.toBe(true);

			expect(codeModelMock.findOne).toHaveBeenCalledWith({
				userId: null,
				employeeId: null,
				managerId: MANAGER_ID,
				type: CodesEnum.Type.MANAGER_RECOVER_PASSWORD,
			});
		});
	});
});
