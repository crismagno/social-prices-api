import { IPhoneNumber, IUser, IUserAddress } from './user.interface';
import UsersEnum from './users.enum';
import { IUserEntity } from './users.types';

export default class UserEntity implements IUserEntity {
	//#region Public properties

	public _id: string;

	public uid: string;

	public email: string;

	public username: string;

	public avatar: string;

	public authToken: string;

	public authProvider: UsersEnum.Provider;

	public phoneNumbers: IPhoneNumber[];

	public status: UsersEnum.Status;

	public extraDataProvider: any;

	public firstName: string;

	public lastName: string;

	public middleName: string;

	public birthDate: Date;

	public addresses: IUserAddress[];

	public gender: UsersEnum.Gender;

	public about: string | null;

	//#endregion

	//#region Constructor

	constructor(private _user: IUser) {
		this._id = _user._id;
		this.uid = _user.uid;
		this.authProvider = _user.authProvider;
		this.authToken = null;
		this.avatar = _user.avatar;
		this.email = _user.email;
		this.phoneNumbers = _user.phoneNumbers;
		this.status = _user.status;
		this.username = _user.username;
		this.extraDataProvider = _user.extraDataProvider;
		this.addresses = _user.addresses;
		this.birthDate = _user.birthDate;
		this.firstName = _user.firstName;
		this.lastName = _user.lastName;
		this.gender = _user.gender;
		this.middleName = _user.middleName;
		this.about = _user.about;
	}

	public async addToken(token: string): Promise<this> {
		this.authToken = token;

		return this;
	}

	//#endregion
}
