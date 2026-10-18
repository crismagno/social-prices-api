import { ArrayMaxSize, IsArray, Matches } from 'class-validator';

export const MAX_IMPORT_CONTACTS: number = 2000;

export default class ImportGoogleContactsDto {
	@IsArray()
	@ArrayMaxSize(MAX_IMPORT_CONTACTS)
	@Matches(/^people\/[A-Za-z0-9_-]+$/, { each: true })
	externalIds: string[];
}
