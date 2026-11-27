import { siteAboutOf } from './store-site-about';
import { siteBlocksOf } from './store-site-blocks';
import { siteCartButtonOf } from './store-site-cart-button';
import { siteCatalogOf } from './store-site-catalog';
import { siteChatOf } from './store-site-chat';
import { siteCheckoutOf } from './store-site-checkout';
import { siteFooterOf } from './store-site-footer';
import { siteHeaderOf } from './store-site-header';
import { heroOptionsOf, heroSlidesOf } from './store-site-hero';
import { siteImageStyleOf } from './store-site-image-style';
import { siteLogoOf } from './store-site-logo';
import { siteMarqueeStyleOf } from './store-site-marquee-style';
import { sitePagesOf } from './store-site-pages';
import { siteSignInOf } from './store-site-sign-in';
import { siteSizesOf } from './store-site-sizes';
import SaveStoreSiteDto from './interfaces/dto/saveStoreSite.dto';

/**
 * What the owner edits of a site, each part checked as it is stored. The
 * address and the products are left to who stores it: a site checks both
 * against the store, a saved mock keeps them only as they were.
 */
export const siteContentOf = (dto: SaveStoreSiteDto) => ({
	templateId: dto.templateId,
	theme: dto.theme,
	displayName: dto.displayName?.trim() || null,
	sizes: siteSizesOf(dto.sizes),
	footer: siteFooterOf(dto.footer),
	signIn: siteSignInOf(dto.signIn),
	catalog: siteCatalogOf(dto.catalog),
	about: siteAboutOf(dto.about),
	pages: sitePagesOf(dto.pages),
	chat: siteChatOf(dto.chat),
	blocks: siteBlocksOf(dto.blocks),
	isLayoutCustom: dto.isLayoutCustom === true,
	header: siteHeaderOf(dto.header),
	cartButton: siteCartButtonOf(dto.cartButton),
	imageStyle: siteImageStyleOf(dto.imageStyle),
	checkout: siteCheckoutOf(dto.checkout),
	marqueeStyle: siteMarqueeStyleOf(dto.marqueeStyle),
	hero: {
		...dto.hero,
		...heroSlidesOf(dto.hero),
		options: heroOptionsOf(dto.hero?.options),
	},
	sections: dto.sections,
	marquee: dto.marquee,
	logo: siteLogoOf(dto.logo),
});
