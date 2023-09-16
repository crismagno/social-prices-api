import { MongooseModule } from '@nestjs/mongoose';

export const MongooseModuleForRoot = () =>
  MongooseModule.forRoot(process.env.URI_MONGO_ATLAS, {
    // useNewUrlParser: true,
    // useCreateIndex: true,
    // useUnifiedTopology: true,
    // useFindAndModify: true,
  });
