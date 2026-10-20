import { MongooseModule } from '@nestjs/mongoose';

import { InstagramChatSchema } from '../../../modules/apps/instagram/instagram-chat.schema';
import { InstagramConnectionSchema } from '../../../modules/apps/instagram/instagram-connection.schema';
import { InstagramMessageSchema } from '../../../modules/apps/instagram/instagram-message.schema';
import { MessengerChatSchema } from '../../../modules/apps/messenger/messenger-chat.schema';
import { MessengerConnectionSchema } from '../../../modules/apps/messenger/messenger-connection.schema';
import { MessengerMessageSchema } from '../../../modules/apps/messenger/messenger-message.schema';
import { TelegramChatSchema } from '../../../modules/apps/telegram/telegram-chat.schema';
import { TelegramConnectionSchema } from '../../../modules/apps/telegram/telegram-connection.schema';
import { TelegramMessageSchema } from '../../../modules/apps/telegram/telegram-message.schema';
import { GoogleContactsConnectionSchema } from '../../../modules/apps/google-contacts/google-contacts-connection.schema';
import { CategorySchema } from '../../../modules/categories/interfaces/category.schema';
import { CodeSchema } from '../../../modules/codes/interfaces/code.schema';
import { CounterSchema } from '../../../modules/counters/interfaces/counter.schema';
import { CustomerSchema } from '../../../modules/customers/interfaces/customer.schema';
import { EmployeeSchema } from '../../../modules/employees/interfaces/employee.schema';
import { FeedbackSchema } from '../../../modules/feedbacks/interfaces/feedback.schema';
import { FileUploadSchema } from '../../../modules/files-uploads/interfaces/file-upload.schema';
import { LogSchema } from '../../../modules/logs/interfaces/log.schema';
import ManagerSchema from '../../../modules/managers/interfaces/manager.schema';
import { NotificationSchema } from '../../../modules/notifications/interfaces/notification.schema';
import { ProductItemSchema } from '../../../modules/product-items/interfaces/product-item.schema';
import { ProductSchema } from '../../../modules/products/interfaces/product.schema';
import { SaleSchema } from '../../../modules/sales/interfaces/sale.schema';
import { StoreSchema } from '../../../modules/stores/interfaces/store.schema';
import { TagSchema } from '../../../modules/tags/interfaces/tags.schema';
import { NoteSchema } from '../../../modules/notes/interfaces/note.schema';
import { TransactionSchema } from '../../../modules/transactions/interfaces/transaction.schema';
import UserSchema from '../../../modules/users/interfaces/user.schema';

export const schemasName = {
	user: 'User',
	code: 'Code',
	store: 'Store',
	product: 'Product',
	category: 'Category',
	customer: 'Customer',
	notification: 'Notification',
	feedback: 'Feedback',
	transaction: 'Transaction',
	note: 'Note',
	sale: 'Sale',
	counter: 'Counter',
	tag: 'Tag',
	employee: 'Employee',
	fileUpload: 'FileUpload',
	log: 'Log',
	manager: 'Manager',
	productItem: 'ProductItem',
	googleContactsConnection: 'GoogleContactsConnection',
	instagramConnection: 'InstagramConnection',
	instagramMessage: 'InstagramMessage',
	instagramChat: 'InstagramChat',
	messengerConnection: 'MessengerConnection',
	messengerMessage: 'MessengerMessage',
	messengerChat: 'MessengerChat',
	telegramConnection: 'TelegramConnection',
	telegramMessage: 'TelegramMessage',
	telegramChat: 'TelegramChat',
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
	note: MongooseModule.forFeature([
		{ name: schemasName.note, schema: NoteSchema },
	]),
	transaction: MongooseModule.forFeature([
		{ name: schemasName.transaction, schema: TransactionSchema },
	]),
	feedback: MongooseModule.forFeature([
		{ name: schemasName.feedback, schema: FeedbackSchema },
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
	log: MongooseModule.forFeature([
		{ name: schemasName.log, schema: LogSchema },
	]),
	manager: MongooseModule.forFeature([
		{ name: schemasName.manager, schema: ManagerSchema },
	]),
	productItem: MongooseModule.forFeature([
		{
			name: schemasName.productItem,
			schema: ProductItemSchema,
			collection: 'product-items',
		},
	]),
	googleContactsConnection: MongooseModule.forFeature([
		{
			name: schemasName.googleContactsConnection,
			schema: GoogleContactsConnectionSchema,
		},
	]),
	instagramConnection: MongooseModule.forFeature([
		{
			name: schemasName.instagramConnection,
			schema: InstagramConnectionSchema,
		},
	]),
	instagramMessage: MongooseModule.forFeature([
		{ name: schemasName.instagramMessage, schema: InstagramMessageSchema },
	]),
	instagramChat: MongooseModule.forFeature([
		{ name: schemasName.instagramChat, schema: InstagramChatSchema },
	]),
	messengerConnection: MongooseModule.forFeature([
		{
			name: schemasName.messengerConnection,
			schema: MessengerConnectionSchema,
		},
	]),
	messengerMessage: MongooseModule.forFeature([
		{ name: schemasName.messengerMessage, schema: MessengerMessageSchema },
	]),
	messengerChat: MongooseModule.forFeature([
		{ name: schemasName.messengerChat, schema: MessengerChatSchema },
	]),
	telegramConnection: MongooseModule.forFeature([
		{ name: schemasName.telegramConnection, schema: TelegramConnectionSchema },
	]),
	telegramMessage: MongooseModule.forFeature([
		{ name: schemasName.telegramMessage, schema: TelegramMessageSchema },
	]),
	telegramChat: MongooseModule.forFeature([
		{ name: schemasName.telegramChat, schema: TelegramChatSchema },
	]),
};
