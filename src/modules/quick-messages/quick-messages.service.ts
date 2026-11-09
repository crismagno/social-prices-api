import { FilterQuery, Model, Types } from 'mongoose';

import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { schemasName } from '../../infra/database/mongo/schemas';
import { queryOptions } from '../../shared/utils/table/table-state';
import {
	ITableStateRequest,
	ITableStateResponse,
} from '../../shared/utils/table/table-state.interface';
import { EmployeesService } from '../employees/employees.service';
import { IEmployee } from '../employees/interfaces/employee.interface';
import EmployeesEnum from '../employees/interfaces/employees.enum';
import { FilesService } from '../files/files-service';
import {
	QuickMessageBlockInputDto,
	QuickMessageUpsertDto,
} from './interfaces/dto/quick-message-upsert.dto';
import {
	IQuickMessage,
	IQuickMessageBlock,
	IQuickMessageMediaBlock,
} from './interfaces/quick-message.interface';
import { QuickMessage } from './interfaces/quick-message.schema';
import QuickMessagesEnum from './interfaces/quick-messages.enum';
import {
	IQuickMessageActor,
	IQuickMessageAvailable,
} from './interfaces/quick-messages.type';

const NOT_DELETED = { 'softDelete.isDeleted': { $ne: true } };

const escapeRegex = (value: string): string =>
	value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const kindOf = (mimeType: string): QuickMessagesEnum.MediaKind => {
	if (mimeType?.startsWith('image/')) {
		return QuickMessagesEnum.MediaKind.IMAGE;
	}

	if (mimeType?.startsWith('video/')) {
		return QuickMessagesEnum.MediaKind.VIDEO;
	}

	if (mimeType?.startsWith('audio/')) {
		return QuickMessagesEnum.MediaKind.AUDIO;
	}

	return QuickMessagesEnum.MediaKind.FILE;
};

// A block before its new file is stored: `fileIndex` says which upload it waits for.
type PendingBlock =
	| IQuickMessageBlock
	| (Omit<IQuickMessageMediaBlock, 'fileKey'> & { fileIndex: number });

@Injectable()
export class QuickMessagesService {
	//#region Private properties

	private readonly _logger: Logger = new Logger(QuickMessagesService.name);

	//#endregion

	//#region Constructor

	constructor(
		@InjectModel(schemasName.quickMessage)
		private readonly _quickMessageModel: Model<QuickMessage>,
		private readonly _filesService: FilesService,
		private readonly _employeesService: EmployeesService,
	) {}

	//#endregion

	//#region Public methods

	public async findTable(
		ownerUserId: string,
		tableState: ITableStateRequest<IQuickMessage>,
	): Promise<ITableStateResponse<IQuickMessage[]>> {
		const filter: FilterQuery<QuickMessage> = { ownerUserId };

		const search: string = tableState?.search?.trim();

		if (search) {
			const pattern: RegExp = new RegExp(escapeRegex(search), 'i');

			filter.$or = [
				{ name: pattern },
				{ 'blocks.text': pattern },
				{ 'blocks.caption': pattern },
			];
		}

		const total: number = await this._quickMessageModel.countDocuments(filter);

		const data: IQuickMessage[] = await this._quickMessageModel
			.find(
				filter,
				null,
				queryOptions<IQuickMessage>({
					...tableState,
					sort: tableState?.sort?.field
						? tableState.sort
						: { field: 'name', order: 'ascend' },
				}),
			)
			.lean<IQuickMessage[]>();

		return { total, data };
	}

	/** One message of the owner, not deleted; 404 otherwise. */
	public async findOneOwned(
		ownerUserId: string,
		id: string,
	): Promise<IQuickMessage> {
		return this._findOwned(ownerUserId, id, false);
	}

	public async create(
		actor: IQuickMessageActor,
		dto: QuickMessageUpsertDto,
		files: Express.Multer.File[],
	): Promise<IQuickMessage> {
		const prepared = await this._prepare(actor, dto, files, null);

		const blocks: IQuickMessageBlock[] = await this._storeFiles(
			prepared.blocks,
			files,
		);

		try {
			const created = await this._quickMessageModel.create({
				ownerUserId: actor.ownerUserId,
				name: prepared.name,
				blocks,
				allEmployees: prepared.allEmployees,
				employeesIds: prepared.employeesIds,
				usageCount: 0,
				lastUsedAt: null,
				createdByEmployeeId: actor.employeeId ?? null,
				updatedByEmployeeId: actor.employeeId ?? null,
				softDelete: null,
			});

			return created as unknown as IQuickMessage;
		} catch (error) {
			await this._deleteFiles(this._newKeys(blocks, []));

			throw error;
		}
	}

	public async update(
		actor: IQuickMessageActor,
		id: string,
		dto: QuickMessageUpsertDto,
		files: Express.Multer.File[],
	): Promise<IQuickMessage> {
		const current: IQuickMessage = await this._findOwned(
			actor.ownerUserId,
			id,
			false,
		);

		const prepared = await this._prepare(actor, dto, files, current);

		const blocks: IQuickMessageBlock[] = await this._storeFiles(
			prepared.blocks,
			files,
		);

		const currentKeys: string[] = this._fileKeys(current.blocks);

		let updated: IQuickMessage;

		try {
			updated = await this._quickMessageModel
				.findOneAndUpdate(
					{ _id: id, ownerUserId: actor.ownerUserId },
					{
						$set: {
							name: prepared.name,
							blocks,
							allEmployees: prepared.allEmployees,
							employeesIds: prepared.employeesIds,
							updatedByEmployeeId: actor.employeeId ?? null,
						},
					},
					{ new: true },
				)
				.lean<IQuickMessage>();
		} catch (error) {
			await this._deleteFiles(this._newKeys(blocks, currentKeys));

			throw error;
		}

		// Only once saved: files the message no longer has.
		const keptKeys: string[] = this._fileKeys(blocks);

		await this._deleteFiles(
			currentKeys.filter((key: string) => !keptKeys.includes(key)),
		);

		return updated;
	}

	public async deleteManual(
		actor: IQuickMessageActor,
		id: string,
		reason: string | null,
	): Promise<void> {
		await this._findOwned(actor.ownerUserId, id, false);

		await this._quickMessageModel.updateOne(
			{ _id: id, ownerUserId: actor.ownerUserId },
			{
				$set: {
					softDelete: {
						isDeleted: true,
						deletedAt: new Date(),
						deletedByUserId: actor.ownerUserId,
						deletedByEmployeeId: actor.employeeId ?? null,
						deletedByManagerId: null,
						reason: reason?.trim() || null,
					},
				},
			},
		);
	}

	public async activateManual(
		actor: IQuickMessageActor,
		id: string,
	): Promise<void> {
		const message: IQuickMessage = await this._findOwned(
			actor.ownerUserId,
			id,
			true,
		);

		if (!message.softDelete?.isDeleted) {
			return;
		}

		await this._assertNameFree(actor.ownerUserId, message.name, id);

		await this._quickMessageModel.updateOne(
			{ _id: id, ownerUserId: actor.ownerUserId },
			{ $set: { softDelete: null } },
		);
	}

	/** The messages the caller may send from the chat, most used first. */
	public async listAvailable(
		actor: IQuickMessageActor,
	): Promise<IQuickMessageAvailable[]> {
		const filter: FilterQuery<QuickMessage> = {
			ownerUserId: actor.ownerUserId,
			...NOT_DELETED,
		};

		if (await this._isRestrictedEmployee(actor)) {
			filter.$or = [{ allEmployees: true }, { employeesIds: actor.employeeId }];
		}

		const messages: IQuickMessage[] = await this._quickMessageModel
			.find(filter, null, { sort: { usageCount: -1, name: 1 } })
			.lean<IQuickMessage[]>();

		return messages.map((message: IQuickMessage) => ({
			_id: String(message._id),
			name: message.name,
			usageCount: message.usageCount ?? 0,
			blocks: message.blocks.map((block: IQuickMessageBlock) => {
				if (block.type === QuickMessagesEnum.BlockType.TEXT) {
					return { type: block.type, text: block.text };
				}

				return {
					type: block.type,
					kind: block.kind,
					fileName: block.fileName,
					mimeType: block.mimeType,
					size: block.size,
					caption: block.caption,
				};
			}),
		}));
	}

	/** Throws 403 when the caller may not send this message. */
	public async assertCanUse(
		actor: IQuickMessageActor,
		message: IQuickMessage,
	): Promise<void> {
		if (!(await this._isRestrictedEmployee(actor))) {
			return;
		}

		const listed: boolean = (message.employeesIds ?? []).some(
			(employeeId: string) => String(employeeId) === String(actor.employeeId),
		);

		if (message.allEmployees || listed) {
			return;
		}

		throw new ForbiddenException({
			code: QuickMessagesEnum.ErrorCode.NOT_ALLOWED,
			message: 'This quick message is not available to you.',
		});
	}

	public async registerUse(id: string): Promise<void> {
		await this._quickMessageModel.updateOne(
			{ _id: id },
			{ $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } },
		);
	}

	//#endregion

	//#region Private methods

	private async _findOwned(
		ownerUserId: string,
		id: string,
		includeDeleted: boolean,
	): Promise<IQuickMessage> {
		if (!Types.ObjectId.isValid(id)) {
			throw new NotFoundException('Quick message not found.');
		}

		const message: IQuickMessage | null = await this._quickMessageModel
			.findOne({
				_id: id,
				ownerUserId,
				...(includeDeleted ? {} : NOT_DELETED),
			})
			.lean<IQuickMessage>();

		if (!message) {
			throw new NotFoundException('Quick message not found.');
		}

		return message;
	}

	// An employee of level EMPLOYEE only sees what is open to them; the owner,
	// ADMIN and MASTER see everything.
	private async _isRestrictedEmployee(
		actor: IQuickMessageActor,
	): Promise<boolean> {
		if (!actor.employeeId) {
			return false;
		}

		const employee: IEmployee | null = await this._employeesService.findById(
			actor.employeeId,
		);

		if (!employee || String(employee.userId) !== String(actor.ownerUserId)) {
			throw new ForbiddenException({
				code: QuickMessagesEnum.ErrorCode.NOT_ALLOWED,
				message: 'This quick message is not available to you.',
			});
		}

		return employee.level === EmployeesEnum.Level.EMPLOYEE;
	}

	private async _assertNameFree(
		ownerUserId: string,
		name: string,
		exceptId: string | null,
	): Promise<void> {
		const taken = await this._quickMessageModel
			.findOne({
				ownerUserId,
				name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
				...NOT_DELETED,
				...(exceptId ? { _id: { $ne: exceptId } } : {}),
			})
			.lean();

		if (taken) {
			throw new ConflictException({
				code: QuickMessagesEnum.ErrorCode.NAME_TAKEN,
				message: 'There is already a quick message with this name.',
			});
		}
	}

	// Checks everything before any file is stored, so a refused save leaves nothing behind.
	private async _prepare(
		actor: IQuickMessageActor,
		dto: QuickMessageUpsertDto,
		files: Express.Multer.File[],
		current: IQuickMessage | null,
	): Promise<{
		name: string;
		allEmployees: boolean;
		employeesIds: string[];
		blocks: PendingBlock[];
	}> {
		const name: string = (dto.name ?? '').trim();

		if (!name || name.length > QuickMessagesEnum.MAX_NAME_LENGTH) {
			throw new BadRequestException(
				`The name must have between 1 and ${QuickMessagesEnum.MAX_NAME_LENGTH} characters.`,
			);
		}

		const inputs: QuickMessageBlockInputDto[] = dto.blocks ?? [];

		if (!inputs.length || inputs.length > QuickMessagesEnum.MAX_BLOCKS) {
			throw new BadRequestException(
				`A quick message has between 1 and ${QuickMessagesEnum.MAX_BLOCKS} blocks.`,
			);
		}

		const currentMedia: IQuickMessageMediaBlock[] = (
			current?.blocks ?? []
		).filter(
			(block: IQuickMessageBlock): block is IQuickMessageMediaBlock =>
				block.type === QuickMessagesEnum.BlockType.MEDIA,
		);

		const usedIndexes: Set<number> = new Set<number>();

		const blocks: PendingBlock[] = inputs.map(
			(input: QuickMessageBlockInputDto): PendingBlock => {
				if (input.type === QuickMessagesEnum.BlockType.TEXT) {
					const text: string = (input.text ?? '').trim();

					if (!text || text.length > QuickMessagesEnum.MAX_TEXT_LENGTH) {
						throw new BadRequestException(
							`Each text must have between 1 and ${QuickMessagesEnum.MAX_TEXT_LENGTH} characters.`,
						);
					}

					return { type: QuickMessagesEnum.BlockType.TEXT, text };
				}

				const caption: string | null = (input.caption ?? '').trim() || null;

				if (caption && caption.length > QuickMessagesEnum.MAX_TEXT_LENGTH) {
					throw new BadRequestException(
						`A caption has at most ${QuickMessagesEnum.MAX_TEXT_LENGTH} characters.`,
					);
				}

				const hasIndex: boolean = Number.isInteger(input.fileIndex);

				if (hasIndex === !!input.fileKey) {
					throw new BadRequestException(
						'Each file block needs either a new file or a kept one.',
					);
				}

				if (input.fileKey) {
					const kept: IQuickMessageMediaBlock | undefined = currentMedia.find(
						(block: IQuickMessageMediaBlock) => block.fileKey === input.fileKey,
					);

					if (!kept) {
						throw new BadRequestException('Unknown file in a block.');
					}

					return { ...kept, caption };
				}

				const file: Express.Multer.File | undefined = files?.[input.fileIndex];

				if (!file?.buffer?.length || usedIndexes.has(input.fileIndex)) {
					throw new BadRequestException('A file block has no file.');
				}

				usedIndexes.add(input.fileIndex);

				return {
					type: QuickMessagesEnum.BlockType.MEDIA,
					kind: kindOf(file.mimetype),
					fileIndex: input.fileIndex,
					fileName: file.originalname,
					mimeType: file.mimetype,
					size: file.size ?? file.buffer.length,
					caption,
				};
			},
		);

		const allEmployees: boolean = dto.allEmployees !== false;

		const employeesIds: string[] = allEmployees
			? []
			: [...new Set((dto.employeesIds ?? []).map(String))];

		if (employeesIds.length) {
			const employees: IEmployee[] =
				await this._employeesService.findByIds(employeesIds);

			const allOwned: boolean =
				employees.length === employeesIds.length &&
				employees.every(
					(employee: IEmployee) =>
						String(employee.userId) === String(actor.ownerUserId),
				);

			if (!allOwned) {
				throw new BadRequestException('Unknown employee in the list.');
			}
		}

		await this._assertNameFree(actor.ownerUserId, name, current?._id ?? null);

		return { name, allEmployees, employeesIds, blocks };
	}

	private async _storeFiles(
		blocks: PendingBlock[],
		files: Express.Multer.File[],
	): Promise<IQuickMessageBlock[]> {
		const stored: IQuickMessageBlock[] = [];

		const uploadedKeys: string[] = [];

		try {
			for (const block of blocks) {
				if (!('fileIndex' in block)) {
					stored.push(block);

					continue;
				}

				const { fileIndex, ...rest } = block;

				const upload = await this._filesService.uploadFile(files[fileIndex]);

				uploadedKeys.push(upload.Key);

				stored.push({ ...rest, fileKey: upload.Key });
			}
		} catch (error) {
			// Some went up before the failure: take them back.
			await this._deleteFiles(uploadedKeys);

			throw error;
		}

		return stored;
	}

	private _fileKeys(blocks: IQuickMessageBlock[]): string[] {
		return (blocks ?? [])
			.filter(
				(block: IQuickMessageBlock): block is IQuickMessageMediaBlock =>
					block.type === QuickMessagesEnum.BlockType.MEDIA,
			)
			.map((block: IQuickMessageMediaBlock) => block.fileKey);
	}

	private _newKeys(blocks: IQuickMessageBlock[], previous: string[]): string[] {
		return this._fileKeys(blocks).filter(
			(key: string) => !previous.includes(key),
		);
	}

	// Best effort: a file left behind costs storage, not correctness.
	private async _deleteFiles(keys: string[]): Promise<void> {
		for (const key of keys) {
			try {
				await this._filesService.deleteFile(key);
			} catch (error) {
				this._logger.warn(`Could not delete file ${key}: ${error?.message}`);
			}
		}
	}

	//#endregion
}
