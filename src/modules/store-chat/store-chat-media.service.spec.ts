import { BadRequestException, NotFoundException } from '@nestjs/common';

import { StoreChatMediaService } from './store-chat-media.service';

const upload = (over: any = {}): any => ({
	buffer: Buffer.from('abc'),
	fileName: 'foto.png',
	mimeType: 'image/png',
	...over,
});

const build = () => {
	const files: any = {
		save: jest.fn().mockResolvedValue('stored.png'),
		read: jest.fn().mockResolvedValue(Buffer.from('abc')),
		remove: jest.fn().mockResolvedValue(undefined),
	};

	return { files, service: new StoreChatMediaService(files) };
};

describe('StoreChatMediaService', () => {
	it('stores the file and describes it for the message', async () => {
		const { service, files } = build();

		await expect(service.store(upload(), false)).resolves.toEqual({
			kind: 'IMAGE',
			mimeType: 'image/png',
			fileName: 'foto.png',
			size: 3,
			width: null,
			height: null,
			duration: null,
			source: { type: 'STORED_FILE', key: 'stored.png' },
		});
		expect(files.save).toHaveBeenCalledTimes(1);
	});

	it.each([
		['image/jpeg', false, 'IMAGE'],
		['video/mp4', false, 'VIDEO'],
		['audio/mpeg', false, 'AUDIO'],
		['audio/mpeg', true, 'VOICE'],
		['application/pdf', false, 'FILE'],
		['', false, 'FILE'],
	])('says %p (voice: %p) is %p', (mimeType, asVoice, kind) => {
		expect(build().service.kindOf(mimeType, asVoice)).toBe(kind);
	});

	it('refuses an empty file, storing nothing', async () => {
		const { service, files } = build();

		await expect(
			service.store(upload({ buffer: Buffer.alloc(0) }), false),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(files.save).not.toHaveBeenCalled();
	});

	it('refuses a file over 16 MB, storing nothing, and takes one of exactly 16 MB', async () => {
		const { service, files } = build();
		const limit: number = 16 * 1024 * 1024;

		await expect(
			service.store(upload({ buffer: Buffer.alloc(limit + 1) }), false),
		).rejects.toMatchObject({
			response: { code: 'STORE_CHAT_FILE_TOO_LARGE' },
		});
		expect(files.save).not.toHaveBeenCalled();

		await service.store(upload({ buffer: Buffer.alloc(limit) }), false);

		expect(files.save).toHaveBeenCalledTimes(1);
	});

	it.each([
		['  oi  ', 'oi'],
		['', null],
		['   ', null],
		[undefined, null],
	])('reads the caption %p as %p', (text, caption) => {
		expect(build().service.caption(text)).toBe(caption);
	});

	it('refuses a caption over 1000 characters', () => {
		expect(() => build().service.caption('a'.repeat(1001))).toThrow(
			BadRequestException,
		);
		expect(build().service.caption('a'.repeat(1000))).toHaveLength(1000);
	});

	describe('read', () => {
		const message = (attachments: any[]): any => ({ _id: 'm1', attachments });
		const stored = {
			mimeType: 'image/png',
			fileName: 'foto.png',
			source: { type: 'STORED_FILE', key: 'stored.png' },
		};

		it('gives the bytes with how the file was named and typed', async () => {
			const { service, files } = build();

			await expect(service.read(message([stored]), 0)).resolves.toEqual({
				buffer: Buffer.from('abc'),
				contentType: 'image/png',
				fileName: 'foto.png',
			});
			expect(files.read).toHaveBeenCalledWith('stored.png');
		});

		it.each([[1], [-1], [NaN]])(
			'finds nothing at an index that is not there (%p)',
			async (index) => {
				const { service, files } = build();

				await expect(
					service.read(message([stored]), index),
				).rejects.toBeInstanceOf(NotFoundException);
				expect(files.read).not.toHaveBeenCalled();
			},
		);

		it('never reads a file that is not one of the chat own', async () => {
			const { service, files } = build();

			await expect(
				service.read(
					message([{ source: { type: 'URL', url: 'http://x/y' } }]),
					0,
				),
			).rejects.toBeInstanceOf(NotFoundException);
			expect(files.read).not.toHaveBeenCalled();
		});

		it('finds nothing when the bytes are gone', async () => {
			const { service, files } = build();

			files.read.mockResolvedValue(null);

			await expect(service.read(message([stored]), 0)).rejects.toBeInstanceOf(
				NotFoundException,
			);
		});
	});

	it('removes the stored files of a message, and only those', async () => {
		const { service, files } = build();

		await service.removeFilesOf({
			attachments: [
				{ source: { type: 'STORED_FILE', key: 'a.png' } },
				{ source: { type: 'URL', url: 'http://x/y' } },
				{ source: { type: 'STORED_FILE', key: 'b.mp3' } },
			],
		} as any);

		expect(files.remove.mock.calls).toEqual([['a.png'], ['b.mp3']]);
	});
});
