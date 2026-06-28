import mongoose from 'mongoose';

export interface ISoftDeleteEntity {
	softDelete: ISoftDelete | null;
}

export interface ISoftDelete {
	isDeleted: boolean;
	deletedAt: Date;
	deletedByUserId: mongoose.Schema.Types.ObjectId;
	deletedByEmployeeId: mongoose.Schema.Types.ObjectId | null;
	reason: string | null;
}
