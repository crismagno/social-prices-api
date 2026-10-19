// What a browser may display by itself. Anything else, SVG and HTML above all,
// could run script from this address, and the file was chosen by a customer.
const INLINE_TYPES: RegExp =
	/^(image\/(jpeg|png|gif|webp)|video\/(mp4|webm)|audio\/[\w.+-]+|application\/pdf)$/;

/** Headers for handing a customer's file to the browser of whoever runs the store. */
export const mediaResponseHeaders = (
	mimeType: string,
	fileName: string,
): Record<string, string> => {
	const isInline: boolean = INLINE_TYPES.test(mimeType);

	return {
		'Content-Type': isInline ? mimeType : 'application/octet-stream',
		'Content-Disposition': `${
			isInline ? 'inline' : 'attachment'
		}; filename*=UTF-8''${encodeURIComponent(fileName).replace(
			/['()*]/g,
			(char: string) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
		)}`,
		'X-Content-Type-Options': 'nosniff',
		'Cache-Control': 'private, max-age=86400',
	};
};
