import { MongooseModule } from '@nestjs/mongoose';

import { CategorySchema } from '../../../modules/categories/interfaces/category.schema';
import CodeSchema from '../../../modules/codes/interfaces/code.schema';
import { CounterSchema } from '../../../modules/counters/interfaces/counter.schema';
import { CustomerSchema } from '../../../modules/customers/interfaces/customer.schema';
import { NotificationSchema } from '../../../modules/notifications/interfaces/notification.schema';
import { ProductSchema } from '../../../modules/products/interfaces/product.schema';
import { SaleSchema } from '../../../modules/sales/interfaces/sale.schema';
import StoreSchema from '../../../modules/stores/interfaces/store.schema';
import UserSchema from '../../../modules/users/interfaces/user.schema';

export const schemasName = {
	user: 'User',
	code: 'Code',
	store: 'Store',
	product: 'Product',
	category: 'Category',
	customer: 'Customer',
	notification: 'Notification',
	sale: 'Sale',
	counter: 'Counter',
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
	category: MongooseModule.forFeature([
		{ name: schemasName.category, schema: CategorySchema },
	]),
	customer: MongooseModule.forFeature([
		{ name: schemasName.customer, schema: CustomerSchema },
	]),
	notification: MongooseModule.forFeature([
		{ name: schemasName.notification, schema: NotificationSchema },
	]),
	sale: MongooseModule.forFeature([
		{ name: schemasName.sale, schema: SaleSchema },
	]),
	counter: MongooseModule.forFeature([
		{ name: schemasName.counter, schema: CounterSchema },
	]),
};
