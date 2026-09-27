import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export default class CreateFeedbackDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(2000)
	message: string;
}
