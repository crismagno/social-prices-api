import { Injectable } from '@nestjs/common';

import { IUser } from './interfaces/user.interface';

@Injectable()
export class UsersService {
	private readonly users: IUser[] = [
		{
			uid: 1,
			username: 'john',
			password: 'changeme',
		},
		{
			uid: 2,
			username: 'maria',
			password: 'guess',
		},
	];

	public async findOne(username: string): Promise<IUser | undefined> {
		return this.users.find((user) => user.username === username);
	}
}
