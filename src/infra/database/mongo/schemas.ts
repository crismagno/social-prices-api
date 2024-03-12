import { MongooseModule } from '@nestjs/mongoose';

import CodeSchema from '../../../codes/interfaces/code.schema';
import { ProductSchema } from '../../../products/interfaces/product.schema';
import StoreSchema from '../../../stores/interfaces/store.schema';
import UserSchema from '../../../users/interfaces/user.schema';

export const schemasName = {
	user: 'User',
	code: 'Code',
	store: 'Store',
	product: 'Product',
};

export const schemasModule = {
	user: MongooseModule.forFeature([
		{ name: schemasName.user, schema: UserSchema },
	]),
	code: MongooseModule.forFeature([
		{ name: schemasName.code, schema: CodeSchema },
	]),
	store: MongooseModule.forFeature([
		{ name: schemasName.store, schema: StoreSchema },
	]),
	product: MongooseModule.forFeature([
		{ name: schemasName.product, schema: ProductSchema },
	]),
};
