import {
	IStoreSiteBlock,
	IStoreSiteContactForm,
} from './interfaces/store-site.interface';
import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteBlocksOf } from './store-site-blocks';
import { IStoreSiteCanvasElement } from './store-site-canvas';

/** Between the key of a canvas section and the key of the form on it. */
export const FORM_KEY_SEPARATOR = '/';

/**
 * The form a key names, as the owner saved it: a form section by its key, or
 * a form placed on a free canvas by "<section>/<element>". A hidden section,
 * or a key that names something else, has no form.
 */
export const pieceFormOf = (
	blocks: unknown,
	formKey: string,
): IStoreSiteContactForm | null => {
	const [blockKey, elementKey, ...rest] = formKey.split(FORM_KEY_SEPARATOR);

	if (!blockKey || rest.length) {
		return null;
	}

	const block: IStoreSiteBlock | undefined = siteBlocksOf(blocks).find(
		(each: IStoreSiteBlock) => each.key === blockKey && each.isActive,
	);

	if (!block) {
		return null;
	}

	if (elementKey === undefined) {
		return block.type === StoreSitesEnum.BlockType.FORM
			? block.settings.form
			: null;
	}

	if (block.type !== StoreSitesEnum.BlockType.CANVAS) {
		return null;
	}

	const element: IStoreSiteCanvasElement | undefined =
		block.settings.canvas?.elements.find(
			(each: IStoreSiteCanvasElement) =>
				each.key === elementKey &&
				each.type === StoreSitesEnum.CanvasElementType.FORM,
		);

	return element?.form ?? null;
};
