import { IPhoneNumber, IUser, IUserAddress } from './user.interface';
import UsersEnum from './users.enum';
import { IUserEntity } from './users.types';

export default class UserEntity implements IUserEntity {
	//#region Public properties

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

	//#endregion

	//#region Constructor

	constructor(private _user: IUser) {
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
	}

	public async addToken(token: string): Promise<this> {
		this.authToken = token;

		return this;
	}

	//#endregion
}
