import ManagersEnum from './managers.enum';

export interface IManagerEntity {
	_id: string;
	name: string;
	email: string;
	birthDate: Date | null;
	level: ManagersEnum.Level;
	isActive: boolean;
	isMain: boolean;
	createdByManagerId: string | null;
	isDeleted: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface IManagersTableFilters {
	level?: ManagersEnum.Level[];
	isActive?: boolean[];
	isDeleted?: boolean;
}

/**
 * The minimum the ManagersService needs to know about whoever is acting.
 * IManagerAuthPayload satisfies this, which keeps ManagersService from having to
 * import anything out of the manager-auth module.
 */
export interface IManagerActor {
	_id: string;
	level: ManagersEnum.Level;
}
