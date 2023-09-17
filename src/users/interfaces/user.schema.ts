import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
	{
		uid: String,
		username: String,
		password: String,
	},
	{ timestamps: true, collection: 'users' },
);

export default UserSchema;
