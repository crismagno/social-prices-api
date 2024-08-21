import mongoose from 'mongoose';

export const SoftDeleteSchema = new mongoose.Schema(
	{
		isDeleted: Boolean,
		deletedAt: Date,
		deletedBy: mongoose.Schema.Types.ObjectId,
		deletedByEmployeeId: {
			type: mongoose.Schema.Types.ObjectId,
			optional: true,
		},
	},
	{ _id: false },
);
