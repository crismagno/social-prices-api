import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * Typed and validated so that `email` can only ever be a string: an untyped body
 * would let `{"email": {"$regex": "^a"}}` reach the Mongo query as an operator.
 */
export default class SignInManagerDto {
	@IsEmail()
	@IsNotEmpty()
	email: string;

	@IsString()
	@IsNotEmpty()
	password: string;
}
