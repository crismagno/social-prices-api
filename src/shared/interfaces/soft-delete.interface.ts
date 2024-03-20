import mongoose from 'mongoose';

export interface ISoftDeleteEntity {
	softDelete: ISoftDelete | null;
}

export interface ISoftDelete {
	isDeleted: boolean;
	deletedAt: Date;
	deletedBy: mongoose.Schema.Types.ObjectId;
}
