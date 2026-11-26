import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteMarqueeStyleOf } from './store-site-marquee-style';

const S = StoreSitesEnum;

describe('siteMarqueeStyleOf', () => {
	it('leaves the strip as the template draws it for a site saved before the options', () => {
		expect(siteMarqueeStyleOf(undefined)).toEqual({
			speed: S.MarqueeSpeed.NORMAL,
			direction: S.MarqueeDirection.LEFT,
			separator: null,
			size: S.MarqueeSize.MEDIUM,
			background: null,
			color: null,
			pauseOnHover: false,
		});
	});

	it('keeps what the owner chose', () => {
		expect(
			siteMarqueeStyleOf({
				speed: S.MarqueeSpeed.FAST,
				direction: S.MarqueeDirection.RIGHT,
				separator: ' ★ ',
				size: S.MarqueeSize.LARGE,
				background: '#1D3A4A',
				color: '#ffffff',
				pauseOnHover: true,
			}),
		).toEqual({
			speed: S.MarqueeSpeed.FAST,
			direction: S.MarqueeDirection.RIGHT,
			separator: '★',
			size: S.MarqueeSize.LARGE,
			background: '#1D3A4A',
			color: '#ffffff',
			pauseOnHover: true,
		});
	});

	it('keeps a separator of at most 3 characters', () => {
		expect(siteMarqueeStyleOf({ separator: '/////' }).separator).toBe('///');
		expect(siteMarqueeStyleOf({ separator: '   ' }).separator).toBeNull();
	});

	it('takes only plain hex colors and known choices', () => {
		const style = siteMarqueeStyleOf({
			background: 'red; display:none',
			color: 'url(x)',
			speed: 'WARP',
			size: 'HUGE',
			direction: 'UP',
		});

		expect(style.background).toBeNull();
		expect(style.color).toBeNull();
		expect(style.speed).toBe(S.MarqueeSpeed.NORMAL);
		expect(style.size).toBe(S.MarqueeSize.MEDIUM);
		expect(style.direction).toBe(S.MarqueeDirection.LEFT);
	});
});
