import mongoose from 'mongoose';

export const SoftDeleteSchema = new mongoose.Schema(
	{
		isDeleted: Boolean,
		deletedAt: Date,
		deletedByUserId: mongoose.Schema.Types.ObjectId,
		deletedByEmployeeId: {
			type: mongoose.Schema.Types.ObjectId,
			optional: true,
		},
		reason: {
			type: String,
			optional: true,
		},
	},
	{ _id: false },
);
