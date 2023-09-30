import {
	ArgumentMetadata,
	BadRequestException,
	PipeTransform,
} from '@nestjs/common';

export class ValidationParamsPipe implements PipeTransform {
	public transform(value: any, metadata: ArgumentMetadata) {
		if (!value) {
			throw new BadRequestException(
				`Value param ${metadata.data} should not be empty.`,
			);
		}

		return value;
	}
}
