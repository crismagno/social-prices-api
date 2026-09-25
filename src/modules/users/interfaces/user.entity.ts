import { IUserLimits } from '../../feature-limits/interfaces/feature-limits.types';
import { IAddress } from '../../../shared/common/address/address.interface';
import PersonEnum from '../../../shared/common/person/person.enum';
import { IPhoneNumber } from '../../../shared/common/phone/phone-number.interface';
import { IUser } from './user.interface';
import UsersEnum from './users.enum';
import { IUserEntity } from './users.types';

export default class UserEntity implements IUserEntity {
	//#region Public properties

	public _id: string;

	public uid: string;

	public email: string;

	public username: string;

	public avatar: string;

	public authProvider: UsersEnum.Provider;

	public phoneNumbers: IPhoneNumber[];

	public status: UsersEnum.Status;

	public extraDataProvider: any;

	public name: string;

	public birthDate: Date;

	public addresses: IAddress[];

	public gender: PersonEnum.Gender;

	public about: string | null;

	public idNumber: string | null;

	public cpf: string | null;

	public cnpj: string | null;

	public type: UsersEnum.Type;

	public limits: IUserLimits | null;

	public createdAt: Date;

	public updatedAt: Date;

	//#endregion

	//#region Constructor

	// A plain parameter, NOT `private _user`: a parameter property is a real
	// instance field and JSON.stringify would ship the raw document, password
	// hash included, in every response that returns this entity.
	constructor(_user: IUser) {
		this._id = _user._id;
		this.uid = _user.uid;
		this.authProvider = _user.authProvider;
		this.avatar = _user.avatar;
		this.email = _user.email;
		this.phoneNumbers = _user.phoneNumbers;
		this.status = _user.status;
		this.username = _user.username;
		this.extraDataProvider = _user.extraDataProvider;
		this.addresses = _user.addresses;
		this.birthDate = _user.birthDate;
		this.name = _user.name;
		this.gender = _user.gender;
		this.about = _user.about;
		this.idNumber = _user.idNumber ?? null;
		this.cpf = _user.cpf ?? null;
		this.cnpj = _user.cnpj ?? null;
		this.type = _user.type;
		this.limits = _user.limits ?? null;
		this.createdAt = _user.createdAt;
		this.updatedAt = _user.updatedAt;
	}

	//#endregion
}
