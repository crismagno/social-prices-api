import { siteCanvasOf } from './store-site-canvas';

const checks = {
	buttonOf: (button: unknown): any => ({ checked: button }),
	mediaOf: (media: unknown): any => (media ? { checked: media } : null),
};

describe('siteCanvasOf', () => {
	it('is an empty canvas of the usual height when nothing was stored', () => {
		expect(siteCanvasOf(undefined, checks)).toEqual({
			height: 480,
			elements: [],
		});
	});

	it('keeps only elements of a known kind, each with a key of its own', () => {
		const { elements } = siteCanvasOf(
			{
				elements: [
					{ key: 'a', type: 'TEXT', text: 'Hi' },
					{ key: 'a', type: 'BOX' },
					{ key: 'x y', type: 'IMAGE' },
					{ key: 'gone', type: 'SCRIPT' },
				],
			},
			checks,
		);

		expect(elements.map((element) => element.type)).toEqual([
			'TEXT',
			'BOX',
			'IMAGE',
		]);
		expect(new Set(elements.map((element) => element.key)).size).toBe(3);
		expect(elements[0].key).toBe('a');
	});

	it('keeps every element inside the canvas, and its numbers in range', () => {
		const [element] = siteCanvasOf(
			{
				height: 300,
				elements: [
					{
						key: 'e',
						type: 'BOX',
						x: 5000,
						y: -40,
						width: 400,
						height: 9000,
						fontSize: 1,
						radius: -3,
						opacity: 400,
						borderWidth: 999,
						color: 'red; x: url(evil)',
						background: '#AABBCC',
					},
				],
			},
			checks,
		).elements;

		expect(element).toMatchObject({
			x: 800,
			y: 0,
			width: 400,
			height: 300,
			fontSize: 8,
			radius: 0,
			opacity: 100,
			borderWidth: 40,
			color: null,
			background: '#AABBCC',
		});
	});

	it('gives a picture, a video and a button only to the kind that has them', () => {
		const [text, image, video, button] = siteCanvasOf(
			{
				elements: [
					{ type: 'TEXT', imageUrl: 'a.png', media: { url: 'v' }, button: {} },
					{ type: 'IMAGE', imageUrl: ' a.png ' },
					{ type: 'VIDEO', media: { url: 'v' } },
					{ type: 'BUTTON', button: { label: 'Go' } },
				],
			},
			checks,
		).elements;

		expect(text).toMatchObject({ imageUrl: null, media: null, button: null });
		expect(image.imageUrl).toBe('a.png');
		expect(video.media).toEqual({ checked: { url: 'v' } });
		expect(button.button).toEqual({ checked: { label: 'Go' } });
	});

	it('cleans the words of the editor, and keeps the words of a button plain', () => {
		const [text, button] = siteCanvasOf(
			{
				elements: [
					{
						type: 'TEXT',
						text: '<p>Hi <strong>there</strong><script>alert(1)</script></p>',
					},
					{ type: 'BUTTON', text: '<p>Buy <em>now</em></p>' },
				],
			},
			checks,
		).elements;

		expect(text.text).toBe('<p>Hi <strong>there</strong></p>');
		expect(button.text).toBe('Buy now');
	});

	it('takes no more elements than a canvas may have', () => {
		const elements = Array.from({ length: 90 }, () => ({ type: 'BOX' }));

		expect(siteCanvasOf({ elements }, checks).elements).toHaveLength(60);
	});
});
