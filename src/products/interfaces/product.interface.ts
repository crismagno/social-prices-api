import mongoose from 'mongoose';

export interface IProduct {
	readonly _id: string;
	name: string;
	quantity: number;
	description: string | null;
	price: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
	userId: mongoose.Schema.Types.ObjectId;
	storeIds: mongoose.Schema.Types.ObjectId[];
	filesUrl: string[];
	mainUrl: string | null;
	barCode: string | null;
}
