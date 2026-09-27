import mongoose from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { INote } from './note.interface';
import NotesEnum from './notes.enum';

@Schema({ timestamps: true, collection: 'notes' })
export class Note implements INote {
	readonly _id: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	userId: string;

	@Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
	createdByUserId: string;

	@Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
	createdByEmployeeId: string | null;

	@Prop({ required: true, type: String })
	title: string;

	@Prop({ required: true, type: String })
	text: string;

	@Prop({ type: String, default: null })
	color: string | null;

	@Prop({ required: true, type: Date })
	date: Date;

	@Prop({
		required: true,
		type: String,
		default: NotesEnum.Status.PENDING,
		enum: {
			values: Object.keys(NotesEnum.Status),
			message: '{VALUE} is not supported',
		},
	})
	status: NotesEnum.Status;

	// Plain strings (not ObjectIds) on purpose: the calendar-marker aggregation
	// runs through `aggregate`, which does not cast ids, so filters and stored
	// values must already be the same type. Same convention as `transactions`.
	@Prop({ type: [String], default: [] })
	tagsIds: string[];

	@Prop({ type: [String], default: [] })
	categoriesIds: string[];

	@Prop({ type: [String], default: [] })
	customerIds: string[];

	@Prop({ type: [String], default: [] })
	saleIds: string[];

	@Prop({ type: [String], default: [] })
	storeIds: string[];

	createdAt: Date;

	updatedAt: Date;
}

export const NoteSchema = SchemaFactory.createForClass(Note);

NoteSchema.index({ userId: 1, date: 1 });
