import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
} from '@nestjs/common';

import QuickMessagesEnum from './interfaces/quick-messages.enum';
import { QuickMessagesSenderService } from './quick-messages-sender.service';

const OWNER = '507f1f77bcf86cd799439011';
const MSG = '507f1f77bcf86cd799439022';
const CONV = '507f1f77bcf86cd799439033';
const CUST = '507f1f77bcf86cd799439044';

const ctx = { ownerUserId: OWNER, employeeId: null };

const media = (key: string, over: any = {}): any => ({
	type: 'MEDIA',
	kind: 'IMAGE',
	fileKey: key,
	fileName: `${key}.png`,
	mimeType: 'image/png',
	size: 3,
	caption: null,
	...over,
});

const build = (blocks: any[], target: any = {}) => {
	const message = { _id: MSG, ownerUserId: OWNER, name: 'x', blocks };
	const quickMessages: any = {
		findOneOwned: jest.fn().mockResolvedValue(message),
		assertCanUse: jest.fn().mockResolvedValue(undefined),
		registerUse: jest.fn().mockResolvedValue(undefined),
	};
	let n = 0;
	const calls: string[] = [];
	const central: any = {
		getSendTarget: jest.fn().mockResolvedValue({
			conversation: { _id: CONV, customerId: CUST, contact: { name: 'Tg' } },
			capabilities: { maxUploadBytes: 100 },
			canReply: true,
			canSendMedia: true,
			...target,
		}),
		reply: jest.fn(async (_c: any, _id: string, text: string) => {
			calls.push(`text:${text}`);
			return { _id: `m${++n}` };
		}),
		sendMedia: jest.fn(
			async (_c: any, _id: string, file: any, options: any) => {
				calls.push(`media:${file.fileName}:${options.caption}`);
				return { _id: `m${++n}` };
			},
		),
	};
	const files: any = {
		getFileBufferByFilename: jest.fn().mockResolvedValue(Buffer.from('abc')),
	};
	const customerModel: any = {
		findOne: jest.fn().mockReturnValue({
			lean: jest.fn().mockResolvedValue({ name: 'Ana', cpf: null }),
		}),
	};
	const employees: any = { findById: jest.fn().mockResolvedValue(null) };
	const users: any = {
		findOneById: jest.fn().mockResolvedValue({ name: 'Dono' }),
	};

	return {
		calls,
		customerModel,
		quickMessages,
		central,
		files,
		service: new QuickMessagesSenderService(
			quickMessages,
			central,
			files,
			customerModel,
			employees,
			users,
		),
	};
};

describe('QuickMessagesSenderService', () => {
	it('refuses before sending anything when the window is closed', async () => {
		const { service, central } = build([{ type: 'TEXT', text: 'oi' }], {
			canReply: false,
		});

		await expect(service.send(ctx, MSG, CONV)).rejects.toBeInstanceOf(
			ConflictException,
		);
		expect(central.reply).not.toHaveBeenCalled();
	});

	it('refuses a message with media on a text-only channel, before sending anything', async () => {
		const { service, central } = build(
			[{ type: 'TEXT', text: 'oi' }, media('a')],
			{ canSendMedia: false },
		);

		await expect(service.send(ctx, MSG, CONV)).rejects.toBeInstanceOf(
			ConflictException,
		);
		expect(central.reply).not.toHaveBeenCalled();
	});

	it('refuses when a stored file is missing, before sending anything', async () => {
		const { service, central, files } = build([
			{ type: 'TEXT', text: 'oi' },
			media('a'),
			media('b'),
		]);
		files.getFileBufferByFilename
			.mockResolvedValueOnce(Buffer.from('a'))
			.mockResolvedValueOnce(null);

		await expect(service.send(ctx, MSG, CONV)).rejects.toMatchObject({
			response: { code: QuickMessagesEnum.ErrorCode.FILE_MISSING },
		});
		expect(central.reply).not.toHaveBeenCalled();
		expect(central.sendMedia).not.toHaveBeenCalled();
	});

	it('refuses when a file is over the channel limit, before sending anything', async () => {
		const { service, central, files } = build([
			{ type: 'TEXT', text: 'oi' },
			media('a'),
		]);
		files.getFileBufferByFilename.mockResolvedValue(Buffer.alloc(101));

		await expect(service.send(ctx, MSG, CONV)).rejects.toMatchObject({
			response: { code: 'FILE_TOO_LARGE' },
		});
		expect(central.reply).not.toHaveBeenCalled();
	});

	it('sends blocks in order, filling fields in texts and captions, skipping a text that renders empty', async () => {
		const { service, calls, central } = build([
			{ type: 'TEXT', text: 'Oi {cliente.nome}' },
			media('a', { caption: 'para {cliente.nome}' }),
			{ type: 'TEXT', text: '{cliente.cpf}' },
			media('b', { caption: '{cliente.cpf}' }),
			{ type: 'TEXT', text: 'fim' },
		]);

		const result = await service.send(ctx, MSG, CONV);

		expect(calls).toEqual([
			'text:Oi Ana',
			'media:a.png:para Ana',
			'media:b.png:null',
			'text:fim',
		]);
		expect(central.sendMedia.mock.calls[0][2]).toMatchObject({
			mimeType: 'image/png',
			buffer: Buffer.from('abc'),
		});
		expect(central.sendMedia.mock.calls[0][3].asVoice).toBe(false);
		expect(result).toMatchObject({ sentCount: 4, totalCount: 4 });
		expect(result.messages).toHaveLength(4);
	});

	it('stops at the failing block and reports sentCount 2 of 4, without counting the use', async () => {
		const { service, central, quickMessages } = build([
			{ type: 'TEXT', text: 'a' },
			{ type: 'TEXT', text: 'b' },
			{ type: 'TEXT', text: 'c' },
			{ type: 'TEXT', text: 'd' },
		]);
		central.reply
			.mockResolvedValueOnce({ _id: 'm1' })
			.mockResolvedValueOnce({ _id: 'm2' })
			.mockRejectedValueOnce(new ConflictException('channel said no'));

		await expect(service.send(ctx, MSG, CONV)).rejects.toMatchObject({
			response: {
				code: QuickMessagesEnum.ErrorCode.PARTIAL_SEND,
				sentCount: 2,
				totalCount: 4,
				messages: [{ _id: 'm1' }, { _id: 'm2' }],
			},
			status: 409,
		});
		expect(central.reply).toHaveBeenCalledTimes(3);
		expect(quickMessages.registerUse).not.toHaveBeenCalled();
	});

	it('rethrows the original error when the first block fails', async () => {
		const { service, central } = build([
			{ type: 'TEXT', text: 'a' },
			{ type: 'TEXT', text: 'b' },
		]);
		const original = new ConflictException('closed');
		central.reply.mockRejectedValueOnce(original);

		await expect(service.send(ctx, MSG, CONV)).rejects.toBe(original);
	});

	it('refuses before sending anything when a filled text goes over 1000 characters', async () => {
		const { service, central, customerModel } = build([
			{ type: 'TEXT', text: 'oi' },
			{ type: 'TEXT', text: '{cliente.nome} '.repeat(20) },
		]);
		customerModel.findOne.mockReturnValue({
			lean: jest.fn().mockResolvedValue({ name: 'x'.repeat(100) }),
		});

		await expect(service.send(ctx, MSG, CONV)).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(central.reply).not.toHaveBeenCalled();
	});

	it('increments usage only after a full send', async () => {
		const { service, quickMessages } = build([{ type: 'TEXT', text: 'a' }]);

		await service.send(ctx, MSG, CONV);

		expect(quickMessages.registerUse).toHaveBeenCalledWith(MSG);
	});

	it('sends nothing when the caller may not use the message', async () => {
		const { service, central, quickMessages } = build([
			{ type: 'TEXT', text: 'a' },
		]);
		quickMessages.assertCanUse.mockRejectedValue(new ForbiddenException());

		await expect(service.send(ctx, MSG, CONV)).rejects.toBeInstanceOf(
			ForbiddenException,
		);
		expect(central.getSendTarget).not.toHaveBeenCalled();
		expect(central.reply).not.toHaveBeenCalled();
	});
});
