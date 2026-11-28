import StoreSitesEnum from './interfaces/store-sites.enum';
import { publicBlocksOf } from './store-site-blocks';
import { pieceFormOf } from './store-site-form-pieces';

const T = StoreSitesEnum.BlockType;

const form = {
	title: 'Budget',
	fields: [{ key: 'company', type: StoreSitesEnum.ContactFieldType.TEXT }],
	destination: StoreSitesEnum.ContactDestination.EMAIL,
	email: 'owner@example.com',
	webhookUrl: 'https://hooks.example.com/x',
};

const blocks = [
	{
		key: 'form-1',
		type: T.FORM,
		pageKey: null,
		isActive: true,
		settings: { form },
	},
	{
		key: 'canvas-1',
		type: T.CANVAS,
		pageKey: null,
		isActive: true,
		settings: {
			canvas: {
				height: 600,
				elements: [
					{
						key: 'el-form',
						type: StoreSitesEnum.CanvasElementType.FORM,
						x: 0,
						y: 0,
						width: 400,
						height: 400,
						form,
					},
					{
						key: 'el-text',
						type: StoreSitesEnum.CanvasElementType.TEXT,
						text: 'Hi',
					},
				],
			},
		},
	},
	{
		key: 'hidden-form',
		type: T.FORM,
		pageKey: null,
		isActive: false,
		settings: { form },
	},
];

describe('pieceFormOf', () => {
	it('finds the form of a form section by its key', () => {
		expect(pieceFormOf(blocks, 'form-1')).toMatchObject({
			title: 'Budget',
			email: 'owner@example.com',
		});
	});

	it('finds a form placed on a canvas by "<section>/<element>"', () => {
		expect(pieceFormOf(blocks, 'canvas-1/el-form')?.title).toBe('Budget');
	});

	it('finds nothing for a hidden section, another kind of element or a bad key', () => {
		expect(pieceFormOf(blocks, 'hidden-form')).toBeNull();
		expect(pieceFormOf(blocks, 'canvas-1/el-text')).toBeNull();
		expect(pieceFormOf(blocks, 'canvas-1')).toBeNull();
		expect(pieceFormOf(blocks, 'form-1/el-form')).toBeNull();
		expect(pieceFormOf(blocks, 'nope')).toBeNull();
		expect(pieceFormOf(blocks, 'a/b/c')).toBeNull();
	});
});

describe('publicBlocksOf: forms', () => {
	it("keeps the owner's e-mail and webhook out of every public form", () => {
		const shown = publicBlocksOf(blocks, []);
		const section = shown.find((block) => block.key === 'form-1');
		const canvas = shown.find((block) => block.key === 'canvas-1');
		const onCanvas = canvas?.settings.canvas?.elements.find(
			(element) => element.key === 'el-form',
		);

		for (const shownForm of [section?.settings.form, onCanvas?.form]) {
			expect(shownForm).toBeTruthy();
			expect(shownForm).not.toHaveProperty('email');
			expect(shownForm).not.toHaveProperty('webhookUrl');
			expect(shownForm?.fields[0].key).toBe('company');
		}
	});
});
