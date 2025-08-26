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
			fileType:
				/(jpg|jpeg|png|gif|webp|svg|txt|json|csv|xls|xlsx|ods|plain|json|csv|excel|spreadsheetml|sheet|pdf|docx)$/,
		})
		.addMaxSizeValidator({
			maxSize: 5242880,
		})
		.build({
			fileIsRequired: !!params?.build?.fileIsRequired,
			errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
		});
