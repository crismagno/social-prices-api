import { AmazonFilesService } from './amazon-files-service';
import { ChatFilesService } from './chat-files-service';
import { LocalFilesService } from './local-files-service';

jest.mock('./amazon-files-service');
jest.mock('./local-files-service');

const file = (fileName: string = 'Foto da Ana.PNG'): any => ({
	buffer: Buffer.from('abc'),
	fileName,
	mimeType: 'image/png',
});

describe('ChatFilesService', () => {
	const env = { ...process.env };

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...env };
		delete process.env.USE_LOCAL_FILES;
	});

	afterAll(() => {
		process.env = env;
	});

	const storageOf = (mock: any): any => mock.mock.instances[0];

	it('keeps the files in a private folder of their own, in the same bucket', () => {
		new ChatFilesService();

		expect(AmazonFilesService).toHaveBeenCalledWith({
			folder: 'chat/',
			isPublic: false,
		});
		expect(LocalFilesService).not.toHaveBeenCalled();
	});

	it('keeps them in their own folder when files are local', () => {
		process.env.USE_LOCAL_FILES = 'true';

		new ChatFilesService();

		expect(LocalFilesService).toHaveBeenCalledWith('/uploads/chat/');
		expect(AmazonFilesService).not.toHaveBeenCalled();
	});

	it('stores under a name of its own, keeping only a plain extension', async () => {
		const service = new ChatFilesService();
		const storage = storageOf(AmazonFilesService);

		storage.uploadFile.mockResolvedValue({ Key: 'stored-key.png' });

		await expect(service.save(file())).resolves.toBe('stored-key.png');

		const sent = storage.uploadFile.mock.calls[0][0];

		expect(sent.originalname).toMatch(/^[0-9a-f-]{36}\.png$/);
		expect(sent.mimetype).toBe('image/png');
		expect(sent.buffer.toString()).toBe('abc');
	});

	it.each([
		['../../etc/passwd'],
		['no-extension'],
		['evil.p/../x'],
		['a.' + 'x'.repeat(20)],
	])('drops whatever is not a plain extension (%p)', async (fileName) => {
		const service = new ChatFilesService();
		const storage = storageOf(AmazonFilesService);

		storage.uploadFile.mockResolvedValue({ Key: 'k' });

		await service.save(file(fileName));

		expect(storage.uploadFile.mock.calls[0][0].originalname).toMatch(
			/^[0-9a-f-]{36}$/,
		);
	});

	it.each([['../secret'], ['a/b.png'], ['..'], ['']])(
		'reads nothing for a key that is not one of its own (%p)',
		async (key) => {
			const service = new ChatFilesService();
			const storage = storageOf(AmazonFilesService);

			await expect(service.read(key)).resolves.toBeNull();
			await service.remove(key);

			expect(storage.getFileBufferByFilename).not.toHaveBeenCalled();
			expect(storage.deleteFile).not.toHaveBeenCalled();
		},
	);

	it('does not fail when a file cannot be removed', async () => {
		const service = new ChatFilesService();

		storageOf(AmazonFilesService).deleteFile.mockRejectedValue(
			new Error('gone'),
		);

		await expect(service.remove('a.png')).resolves.toBeUndefined();
	});
});
