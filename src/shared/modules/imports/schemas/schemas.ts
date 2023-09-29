import { MongooseModule } from '@nestjs/mongoose';

import CodeSchema from '../../../../codes/interfaces/code.schema';
import UserSchema from '../../../../users/interfaces/user.schema';

export const schemasName = {
	user: 'User',
	code: 'Code',
};

export const schemasModule = {
	user: MongooseModule.forFeature([
		{ name: schemasName.user, schema: UserSchema },
	]),
	code: MongooseModule.forFeature([
		{ name: schemasName.code, schema: CodeSchema },
	]),
};
