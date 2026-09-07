import * as moment from 'moment';

import {
	getCartBgImage,
	getLogo1,
	getMessageBgImage,
	getPadlockBgImage,
} from '../../images/images-url';
import { getHtmlFromTemplate } from '../templates';
import TemplatesEnum from '../templates.enum';

export enum EmailHeroCategory {
	AUTH = 'AUTH',
	SALE = 'SALE',
	GENERIC = 'GENERIC',
}

export interface IRenderEmailParams {
	title: string;
	heroImageSrc: string;
	heroImageAlt: string;
	bodyRelativePath: TemplatesEnum.RelativePath;
	bodyData: any;
}

export const getHeroImageByCategory = (category: EmailHeroCategory): string => {
	switch (category) {
		case EmailHeroCategory.AUTH:
			return getPadlockBgImage();
		case EmailHeroCategory.SALE:
			return getCartBgImage();
		default:
			return getMessageBgImage();
	}
};

export const renderEmailHtml = ({
	title,
	heroImageSrc,
	heroImageAlt,
	bodyRelativePath,
	bodyData,
}: IRenderEmailParams): string => {
	const body: string = getHtmlFromTemplate({
		relativePath: bodyRelativePath,
		data: bodyData,
	});

	const year: string = moment().format('YYYY');

	return getHtmlFromTemplate({
		relativePath: TemplatesEnum.RelativePath.EMAIL_LAYOUT_HBS,
		data: {
			title,
			heroImageSrc,
			heroImageAlt,
			body,
			logoSrc: getLogo1(),
			appName: 'Social Prices',
			tagline: `Buy and sell with confidence. © ${year} Social Prices. All rights reserved.`,
		},
	});
};
