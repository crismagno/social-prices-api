import {
	HttpStatus,
	ParseFileOptions,
	ParseFilePipeBuilder,
} from '@nestjs/common';

export const parseFilePipeBuilder = (params?: {
	build?: Omit<ParseFileOptions, 'validators'>;
}) =>
	new ParseFilePipeBuilder()
		.addFileTypeValidator({
			fileType: /(jpg|jpeg|png|gif)$/,
		})
		.addMaxSizeValidator({
			maxSize: 5242880,
		})
		.build({
			...params,
			errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
		});
