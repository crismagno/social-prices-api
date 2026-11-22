import StoreSitesEnum from './interfaces/store-sites.enum';
import { embedUrlOf, siteAboutOf } from './store-site-about';

const Media = StoreSitesEnum.AboutMediaType;
const Position = StoreSitesEnum.AboutMediaPosition;

describe('embedUrlOf', () => {
	it.each([
		[
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
		],
		[
			'youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
		],
		[
			'https://youtu.be/dQw4w9WgXcQ',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
		],
		[
			'https://www.youtube.com/shorts/dQw4w9WgXcQ',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
		],
		[
			'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
			'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
		],
		['https://vimeo.com/76979871', 'https://player.vimeo.com/video/76979871'],
		[
			'https://player.vimeo.com/video/76979871',
			'https://player.vimeo.com/video/76979871',
		],
	])('turns %s into the player of the video', (link, embed) => {
		expect(embedUrlOf(link)).toBe(embed);
	});

	it.each([
		'https://evil.com/watch?v=dQw4w9WgXcQ',
		'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
		'javascript:alert(1)',
		'https://www.youtube.com/watch?v=<script>',
		'https://vimeo.com/abc',
		'',
	])('refuses %p', (link) => {
		expect(embedUrlOf(link)).toBeNull();
	});
});

describe('siteAboutOf', () => {
	it('for a site saved before it existed: shown, with the store text and no media', () => {
		expect(siteAboutOf(undefined)).toEqual({
			isActive: true,
			title: null,
			texts: [],
			media: null,
			mediaPosition: Position.LEFT,
		});
	});

	it('keeps what the owner chose, trimmed, without empty texts', () => {
		expect(
			siteAboutOf({
				isActive: false,
				title: ' Nossa história ',
				texts: [' Começamos em 2019. ', '', '  ', 'Hoje somos três.'],
				media: { type: Media.IMAGE, url: 'atelie.png' },
				mediaPosition: Position.TOP,
			}),
		).toEqual({
			isActive: false,
			title: 'Nossa história',
			texts: ['Começamos em 2019.', 'Hoje somos três.'],
			media: { type: Media.IMAGE, url: 'atelie.png' },
			mediaPosition: Position.TOP,
		});
	});

	it('keeps a video link only as the player of a known site', () => {
		expect(
			siteAboutOf({
				media: { type: Media.EMBED, url: 'https://youtu.be/dQw4w9WgXcQ' },
			}).media,
		).toEqual({
			type: Media.EMBED,
			url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
		});
		expect(
			siteAboutOf({ media: { type: Media.EMBED, url: 'https://evil.com/x' } })
				.media,
		).toBeNull();
	});

	it('keeps an uploaded video, and drops media of an unknown kind', () => {
		expect(
			siteAboutOf({ media: { type: Media.VIDEO, url: 'clip.mp4' } }).media,
		).toEqual({
			type: Media.VIDEO,
			url: 'clip.mp4',
		});
		expect(
			siteAboutOf({ media: { type: 'AUDIO', url: 'a.mp3' } }).media,
		).toBeNull();
		expect(
			siteAboutOf({ media: { type: Media.IMAGE, url: '  ' } }).media,
		).toBeNull();
	});

	it('keeps at most six texts and cuts long ones', () => {
		const about = siteAboutOf({
			title: 'T'.repeat(200),
			texts: Array.from({ length: 10 }, () => 'x'.repeat(3000)),
		});

		expect(about.texts).toHaveLength(6);
		expect(about.texts[0]).toHaveLength(1500);
		expect(about.title).toHaveLength(80);
	});

	it('falls back to the left for an unknown position, and survives garbage', () => {
		expect(siteAboutOf({ mediaPosition: 'UP' }).mediaPosition).toBe(
			Position.LEFT,
		);
		expect(siteAboutOf('x').texts).toEqual([]);
		expect(siteAboutOf({ texts: 'x', media: 'y' })).toMatchObject({
			texts: [],
			media: null,
		});
	});
});
