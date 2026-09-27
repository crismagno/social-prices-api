import FeedbacksEnum from './feedbacks.enum';

export interface IFeedback {
	readonly _id: string;
	userId: string;
	employeeId: string | null;
	email: string;
	name: string | null;
	message: string;
	status: FeedbacksEnum.Status;
	statusUpdatedAt: Date | null;
	statusUpdatedByManagerId: string | null;
	createdAt: Date;
	updatedAt: Date;
}
