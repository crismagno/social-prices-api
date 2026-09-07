import { MongooseModule } from '@nestjs/mongoose';

import {
	CategorySchema,
} from '../../../modules/categories/interfaces/category.schema';
import { CodeSchema } from '../../../modules/codes/interfaces/code.schema';
import {
	CounterSchema,
} from '../../../modules/counters/interfaces/counter.schema';
import {
	CustomerSchema,
} from '../../../modules/customers/interfaces/customer.schema';
import {
	EmployeeSchema,
} from '../../../modules/employees/interfaces/employee.schema';
import {
	FileUploadSchema,
} from '../../../modules/files-uploads/interfaces/file-upload.schema';
import {
	NotificationSchema,
} from '../../../modules/notifications/interfaces/notification.schema';
import {
	ProductItemSchema,
} from '../../../modules/product-items/interfaces/product-item.schema';
import {
	ProductSchema,
} from '../../../modules/products/interfaces/product.schema';
import { SaleSchema } from '../../../modules/sales/interfaces/sale.schema';
import { StoreSchema } from '../../../modules/stores/interfaces/store.schema';
import { TagSchema } from '../../../modules/tags/interfaces/tags.schema';
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
	tag: 'Tag',
	employee: 'Employee',
	fileUpload: 'FileUpload',
	productItem: 'ProductItem',
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
	tag: MongooseModule.forFeature([
		{ name: schemasName.tag, schema: TagSchema },
	]),
	employee: MongooseModule.forFeature([
		{ name: schemasName.employee, schema: EmployeeSchema },
	]),
	fileUpload: MongooseModule.forFeature([
		{ name: schemasName.fileUpload, schema: FileUploadSchema },
	]),
	productItem: MongooseModule.forFeature([
		{
			name: schemasName.productItem,
			schema: ProductItemSchema,
			collection: 'product-items',
		},
	]),
};
