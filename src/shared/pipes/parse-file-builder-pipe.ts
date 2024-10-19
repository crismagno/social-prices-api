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
			fileType: /(jpg|jpeg|png|gif|xlsx|sheet)$/,
		})
		.addMaxSizeValidator({
			maxSize: 5242880,
		})
		.build({
			fileIsRequired: !!params?.build?.fileIsRequired,
			errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
		});
