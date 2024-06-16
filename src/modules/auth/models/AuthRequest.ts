import { Request } from 'express';
import UserEntity from 'src/modules/users/interfaces/user.entity';

export interface AuthRequest extends Request {
	user: UserEntity;
}
