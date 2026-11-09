import { ICreatedAtEntity } from '../../../shared/common/global/created-at.interface';
import { IUpdatedAtEntity } from '../../../shared/common/global/updated-at.interface';
import { ISoftDeleteEntity } from '../../../shared/common/soft-delete/soft-delete.interface';
import QuickMessagesEnum from './quick-messages.enum';

export interface IQuickMessageTextBlock {
	type: QuickMessagesEnum.BlockType.TEXT;
	text: string;
}

export interface IQuickMessageMediaBlock {
	type: QuickMessagesEnum.BlockType.MEDIA;
	kind: QuickMessagesEnum.MediaKind;
	/** Where the file is kept (the FilesService key). Never sent to the chat page. */
	fileKey: string;
	fileName: string;
	mimeType: string;
	size: number;
	caption: string | null;
}

export type IQuickMessageBlock =
	| IQuickMessageTextBlock
	| IQuickMessageMediaBlock;

export interface IQuickMessage
	extends ICreatedAtEntity,
		IUpdatedAtEntity,
		ISoftDeleteEntity {
	readonly _id: string;
	ownerUserId: string;
	name: string;
	blocks: IQuickMessageBlock[];
	/** Every employee may use it; otherwise only the ones in `employeesIds`. */
	allEmployees: boolean;
	employeesIds: string[];
	usageCount: number;
	lastUsedAt: Date | null;
	createdByEmployeeId: string | null;
	updatedByEmployeeId: string | null;
}
