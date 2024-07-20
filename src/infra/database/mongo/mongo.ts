import { MongooseModule } from '@nestjs/mongoose';

export const MongooseModuleForRoot = () =>
	MongooseModule.forRoot(process.env.MONGO_URI, {
		// useNewUrlParser: true,
		// useCreateIndex: true,
		// useUnifiedTopology: true,
		// useFindAndModify: true,
	});
