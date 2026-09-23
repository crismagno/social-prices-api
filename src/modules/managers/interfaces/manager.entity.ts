import { IManager } from './manager.interface';
import ManagersEnum from './managers.enum';
import { IManagerEntity } from './managers.types';

export default class ManagerEntity implements IManagerEntity {
	//#region Public properties

	public _id: string;

	public name: string;

	public email: string;

	public birthDate: Date | null;

	public level: ManagersEnum.Level;

	public isActive: boolean;

	public isMain: boolean;

	public createdByManagerId: string | null;

	public isDeleted: boolean;

	public createdAt: Date;

	public updatedAt: Date;

	//#endregion

	//#region Constructor

	// A plain parameter, NOT `private _manager`: a parameter property is a real
	// instance field and JSON.stringify would ship the raw document, password
	// hash included, in every response that returns this entity.
	constructor(_manager: IManager) {
		this._id = _manager._id;
		this.name = _manager.name;
		this.email = _manager.email;
		this.birthDate = _manager.birthDate;
		this.level = _manager.level;
		this.isActive = _manager.isActive;
		this.isMain = _manager.isMain;
		this.createdByManagerId = _manager.createdByManagerId
			? _manager.createdByManagerId.toString()
			: null;
		this.isDeleted = _manager.softDelete?.isDeleted ?? false;
		this.createdAt = _manager.createdAt;
		this.updatedAt = _manager.updatedAt;
	}

	//#endregion
}
