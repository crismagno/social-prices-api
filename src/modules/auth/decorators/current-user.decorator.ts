import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import UserEntity from '../../users/interfaces/user.entity';
import { AuthRequest } from '../models/AuthRequest';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<any>();
    const dataUser = {
      _id: request?.AUTH_PAYLOAD?._id,
      uid: request?.AUTH_PAYLOAD?.uid,
      email: request?.AUTH_PAYLOAD?.email,
    }
    return dataUser;
  },
);