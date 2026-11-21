import { AmazonFilesService } from './amazon-files-service';

const upload = jest.fn();
const getObject = jest.fn();
const deleteObject = jest.fn();

jest.mock('aws-sdk', () => ({
	S3: jest.fn().mockImplementation(() => ({ upload, getObject, deleteObject })),
}));

const file: any = {
	originalname: 'foto.png',
	buffer: Buffer.from('abc'),
	mimetype: 'image/png',
};

describe('AmazonFilesService', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		upload.mockImplementation((params: any) => ({
			promise: async () => ({ Key: params.Key, Bucket: params.Bucket }),
		}));
		getObject.mockReturnValue({
			promise: async () => ({ Body: Buffer.from('abc') }),
		});
		deleteObject.mockImplementation((_params: any, done: any) =>
			done(null, {}),
		);
	});

	it('by default writes at the root of the bucket, readable by address, as before', async () => {
		const service = new AmazonFilesService();

		const stored = await service.uploadFile(file);
		const params = upload.mock.calls[0][0];

		expect(params.Key).toBe(stored.Key);
		expect(params.Key).toMatch(/^foto-.+\.png$/);
		expect(params.ACL).toBe('public-read');
	});

	it('with a folder, keeps the file inside it and private, and names it without the folder', async () => {
		const service = new AmazonFilesService({
			folder: 'chat/',
			isPublic: false,
		});

		const stored = await service.uploadFile(file);
		const params = upload.mock.calls[0][0];

		expect(params.Key).toBe(`chat/${stored.Key}`);
		expect(stored.Key).not.toContain('/');
		expect('ACL' in params).toBe(false);
	});

	it('reads and removes inside its folder', async () => {
		const service = new AmazonFilesService({ folder: 'chat/' });

		await service.getFileBufferByFilename('a.png');
		await service.deleteFile('a.png');

		expect(getObject.mock.calls[0][0].Key).toBe('chat/a.png');
		expect(deleteObject.mock.calls[0][0].Key).toBe('chat/a.png');
	});
});
