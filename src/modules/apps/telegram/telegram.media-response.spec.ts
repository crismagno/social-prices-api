import { mediaResponseHeaders } from './telegram.media-response';

describe('mediaResponseHeaders', () => {
	it.each([
		'image/jpeg',
		'image/webp',
		'video/mp4',
		'audio/ogg',
		'application/pdf',
	])('shows %s in the browser', (mimeType) => {
		const headers = mediaResponseHeaders(mimeType, 'f.bin');

		expect(headers['Content-Type']).toBe(mimeType);
		expect(headers['Content-Disposition']).toMatch(/^inline;/);
	});

	it.each([
		'text/html',
		'image/svg+xml',
		'application/x-tgsticker',
		'application/zip',
	])('only offers %s as a download, since a customer chose it', (mimeType) => {
		const headers = mediaResponseHeaders(mimeType, 'f.bin');

		expect(headers['Content-Type']).toBe('application/octet-stream');
		expect(headers['Content-Disposition']).toMatch(/^attachment;/);
	});

	it('never lets the browser guess another type', () => {
		expect(
			mediaResponseHeaders('image/png', 'a.png')['X-Content-Type-Options'],
		).toBe('nosniff');
	});

	it('carries a name with accents and quotes without breaking the header', () => {
		const header = mediaResponseHeaders(
			'application/pdf',
			'orçamento "final".pdf',
		)['Content-Disposition'];

		expect(header).toContain(
			"filename*=UTF-8''or%C3%A7amento%20%22final%22.pdf",
		);
		expect(header).not.toMatch(/[^\x20-\x7e]/);
	});
});
