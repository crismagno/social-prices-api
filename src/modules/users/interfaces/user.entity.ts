import PersonEnum from '../../../shared/enums/person.enum';
import { IAddress } from '../../../shared/interfaces/address.interface';
import { IPhoneNumber } from '../../../shared/interfaces/phone-number.interface';
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

	public type: UsersEnum.Type;

	public createdAt: Date;

	public updatedAt: Date;

	//#endregion

	//#region Constructor

	constructor(private _user: IUser) {
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
		this.type = _user.type;
		this.createdAt = _user.createdAt;
		this.updatedAt = _user.updatedAt;
	}

	//#endregion
}
