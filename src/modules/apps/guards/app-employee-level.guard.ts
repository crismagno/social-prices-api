import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
} from '@nestjs/common';

import AuthEnum from '../../auth/interfaces/auth.enum';
import { IAuthPayload } from '../../auth/interfaces/auth.types';
import { EmployeesService } from '../../employees/employees.service';
import { IEmployee } from '../../employees/interfaces/employee.interface';
import EmployeesEnum from '../../employees/interfaces/employees.enum';

export const APP_EMPLOYEE_LEVEL_FORBIDDEN_CODE: string =
	'APP_EMPLOYEE_LEVEL_FORBIDDEN';

/**
 * Connect / sync / disconnect change the owner's data, so an employee acting for
 * the owner needs ADMIN or MASTER. The owner user (no employeeId) always passes.
 * The level is re-read from the database, not trusted from the token.
 */
@Injectable()
export class AppEmployeeLevelGuard implements CanActivate {
	constructor(private readonly _employeesService: EmployeesService) {}

	public async canActivate(context: ExecutionContext): Promise<boolean> {
		const request: any = context.switchToHttp().getRequest();
		const payload: IAuthPayload = request[AuthEnum.RequestProps.AUTH_PAYLOAD];

		if (!payload?.employeeId) {
			return true;
		}

		const employee: IEmployee | null = await this._employeesService.findById(
			payload.employeeId,
		);

		if (!employee || employee.level === EmployeesEnum.Level.EMPLOYEE) {
			throw new ForbiddenException({
				code: APP_EMPLOYEE_LEVEL_FORBIDDEN_CODE,
				message: 'Only ADMIN or MASTER employees can manage apps.',
			});
		}

		return true;
	}
}
