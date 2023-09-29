import { Document } from 'mongoose';

import CodesEnum from './codes.enum';

export interface ICode extends Document {
	userId: string;
	value: string;
	type: CodesEnum.Type;
	expiresIn: Date;
}
