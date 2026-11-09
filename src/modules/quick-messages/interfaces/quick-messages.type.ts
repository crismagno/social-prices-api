import { IInboxMessageView } from '../../inbox/interfaces/inbox-central.types';
import {
	IQuickMessage,
	IQuickMessageMediaBlock,
	IQuickMessageTextBlock,
} from './quick-message.interface';

/** A file block as the chat page sees it: everything but where it is kept. */
export type IQuickMessageAvailableMediaBlock = Omit<
	IQuickMessageMediaBlock,
	'fileKey'
>;

/** What the chat page needs of a quick message it may send. */
export interface IQuickMessageAvailable
	extends Pick<IQuickMessage, '_id' | 'name' | 'usageCount'> {
	blocks: (IQuickMessageTextBlock | IQuickMessageAvailableMediaBlock)[];
}

export type QuickMessageFieldGroup = 'cliente' | 'funcionario';

/** A field the text may use, for the editor's "insert field" list. */
export interface IQuickMessageFieldInfo {
	key: string;
	group: QuickMessageFieldGroup;
	labelKey: string;
}

export interface IQuickMessageSendResult {
	messages: IInboxMessageView[];
	sentCount: number;
	totalCount: number;
}

/** Who acts: the owner, directly or through an employee. */
export interface IQuickMessageActor {
	ownerUserId: string;
	employeeId: string | null;
}
