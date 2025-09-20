import {
	HttpStatus,
	ParseFileOptions,
	ParseFilePipeBuilder,
} from '@nestjs/common';

export type TAllowTypes =
	| 'image'
	| 'text'
	| 'spreadsheet'
	| 'document'
	| 'audio'
	| 'video';

export const parseFilePipeBuilder = (params?: {
	build?: Omit<ParseFileOptions, 'validators'>;
	allowOnlyTypes?: TAllowTypes[];
}) => {
	const allowedTypes: RegExp = getAllowedTypes(params?.allowOnlyTypes || []);

	return new ParseFilePipeBuilder()
		.addFileTypeValidator({
			fileType: allowedTypes,
		})
		.addMaxSizeValidator({
			maxSize: 5242880,
		})
		.build({
			fileIsRequired: !!params?.build?.fileIsRequired,
			errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
		});
};

const getAllowedTypes = (allowOnlyTypes: TAllowTypes[]): RegExp => {
	const imageTypes =
		/(jpg|jpeg|png|gif|webp|svg|image\/(jpeg|png|gif|webp|svg\+xml))$/i;

	const textTypes = /(txt|json|csv|plain|application\/(json|csv|text))$/i;

	const spreadsheetTypes =
		/(xls|xlsx|ods|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/i;

	const documentTypes =
		/(pdf|doc|docx|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i;

	const audioTypes =
		/(mp3|wav|ogg|m4a|flac|aac|application\/octet-stream|audio\/(mpeg|wav|ogg|m4a|flac|aac))$/i;

	const videoTypes =
		/(mp4|avi|mov|webm|mkv|video\/(mp4|x-msvideo|quicktime|webm|x-matroska))$/i;

	const allowedTypesList: RegExp[] = [];

	if (allowOnlyTypes.length) {
		for (const allowOnlyType of allowOnlyTypes) {
			switch (allowOnlyType) {
				case 'image':
					allowedTypesList.push(imageTypes);
					break;
				case 'text':
					allowedTypesList.push(textTypes);
					break;
				case 'spreadsheet':
					allowedTypesList.push(spreadsheetTypes);
					break;
				case 'document':
					allowedTypesList.push(documentTypes);
					break;
				case 'audio':
					allowedTypesList.push(audioTypes);
					break;
				case 'video':
					allowedTypesList.push(videoTypes);
					break;
			}
		}
	} else {
		allowedTypesList.push(
			imageTypes,
			textTypes,
			spreadsheetTypes,
			documentTypes,
			audioTypes,
			videoTypes,
		);
	}

	const allowedTypesJoin: string = allowedTypesList
		.map((r) => r.source)
		.join('|');

	return new RegExp(`(${allowedTypesJoin})$`, 'i');
};
