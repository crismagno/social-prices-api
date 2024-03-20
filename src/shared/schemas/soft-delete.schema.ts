import mongoose from 'mongoose';

export const SoftDeleteSchema = {
	type: new mongoose.Schema(
		{
			isDeleted: Boolean,
			deletedAt: Date,
			deletedBy: mongoose.Schema.Types.ObjectId,
		},
		{ _id: false },
	),
	optional: true,
};
