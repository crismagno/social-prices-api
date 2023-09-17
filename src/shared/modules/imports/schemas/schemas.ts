import { MongooseModule } from '@nestjs/mongoose';

import UserSchema from '../../../../users/interfaces/user.schema';

export const schemasName = {
	user: 'User',
};

export const schemasModule = {
	user: MongooseModule.forFeature([
		{ name: schemasName.user, schema: UserSchema },
	]),
};
