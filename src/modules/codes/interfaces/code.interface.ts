import mongoose, { Document } from 'mongoose';

import CodesEnum from './codes.enum';

export interface ICode extends Document {
	readonly _id: string;
	userId: mongoose.Schema.Types.ObjectId;
	value: string;
	type: CodesEnum.Type;
	expiresIn: Date;
}
