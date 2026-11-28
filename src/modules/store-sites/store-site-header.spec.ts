import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteHeaderOf } from './store-site-header';

describe('siteHeaderOf', () => {
	it('puts the header of a site saved before the option at the top, going with the page', () => {
		expect(siteHeaderOf(undefined)).toEqual({
			isFixed: false,
			position: StoreSitesEnum.HeaderPosition.TOP,
			order: ['BRAND', 'MENU', 'ACTIONS'],
			transparency: 0,
			shadow: null,
			color: null,
			background: null,
			height: null,
			width: null,
			buttons: [],
			actionsOrder: ['SIGN_IN', 'CART'],
			buttonSize: 'MEDIUM',
			aligns: {},
		});
	});

	it('keeps the icon and the colour of a button, when they are good ones', () => {
		const [good, bad] = siteHeaderOf({
			buttons: [
				{ label: 'Hi', icon: 'HEART', color: '#FF0055' },
				{ label: 'Hi', icon: 'nope', color: 'red; x: url(evil)' },
			],
		}).buttons;

		expect(good).toMatchObject({ icon: 'HEART', color: '#ff0055' });
		expect(bad).toMatchObject({ icon: null, color: null });
	});

	it('keeps a shadow strength within 0 and 100, or the usual one', () => {
		expect(siteHeaderOf({ shadow: 40.4 }).shadow).toBe(40);
		expect(siteHeaderOf({ shadow: 500 }).shadow).toBe(100);
		expect(siteHeaderOf({ shadow: -3 }).shadow).toBe(0);
		expect(siteHeaderOf({ shadow: 0 }).shadow).toBe(0);
		expect(siteHeaderOf({ shadow: 'strong' }).shadow).toBeNull();
	});

	it.each(Object.values(StoreSitesEnum.HeaderPosition))(
		'keeps the side the owner chose: %s',
		(position) => {
			expect(siteHeaderOf({ position }).position).toBe(position);
		},
	);

	it('takes a side it does not know for the top', () => {
		expect(siteHeaderOf({ position: 'MIDDLE' }).position).toBe(
			StoreSitesEnum.HeaderPosition.TOP,
		);
	});

	it('keeps it on screen only when the owner said so', () => {
		expect(siteHeaderOf({ isFixed: true }).isFixed).toBe(true);
		expect(siteHeaderOf({ isFixed: 'yes' }).isFixed).toBe(false);
	});

	it('keeps the order of its parts when each is there once', () => {
		expect(siteHeaderOf({ order: ['MENU', 'BRAND', 'ACTIONS'] }).order).toEqual(
			['MENU', 'BRAND', 'ACTIONS'],
		);
	});

	it.each([
		['a part twice', ['MENU', 'MENU', 'ACTIONS']],
		['a part missing', ['MENU', 'BRAND']],
		['a part it does not know', ['MENU', 'BRAND', 'OTHER']],
		['nothing', null],
	])('takes an order with %s for the usual one', (_label, order) => {
		expect(siteHeaderOf({ order }).order).toEqual(['BRAND', 'MENU', 'ACTIONS']);
	});

	it('keeps a clean background and a colour of its own, only a valid one', () => {
		expect(
			siteHeaderOf({ transparency: 40.4, color: '#ffffff' }),
		).toMatchObject({ transparency: 40, color: '#ffffff' });
		expect(siteHeaderOf({ transparency: 500 }).transparency).toBe(100);
		expect(siteHeaderOf({ transparency: -3 }).transparency).toBe(0);
		// Saved when it was only on or off.
		expect(siteHeaderOf({ isTransparent: true }).transparency).toBe(100);
		expect(siteHeaderOf({ color: 'white' }).color).toBeNull();
		expect(siteHeaderOf({ background: '#101010' }).background).toBe('#101010');
		expect(siteHeaderOf({ background: 'black' }).background).toBeNull();
	});

	it('keeps its sizes within what a page can take', () => {
		expect(siteHeaderOf({ height: 72.4, width: 300 })).toMatchObject({
			height: 72,
			width: 300,
		});
		expect(siteHeaderOf({ height: 5, width: 9000 })).toMatchObject({
			height: 40,
			width: 480,
		});
		expect(siteHeaderOf({ height: '80' }).height).toBeNull();
	});

	it('keeps the buttons the owner added, checked, at most four', () => {
		const { buttons } = siteHeaderOf({
			buttons: [
				{ label: ' Fale conosco ', target: 'WHATSAPP', value: '5511999990000' },
				...Array.from({ length: 6 }, () => ({ label: 'x' })),
			],
		});

		expect(buttons).toHaveLength(4);
		expect(buttons[0]).toMatchObject({
			label: 'Fale conosco',
			target: 'WHATSAPP',
			value: '5511999990000',
		});
	});

	it("orders its buttons one by one, the owner's own among the sign-in and the cart", () => {
		const buttons = [{ label: 'a' }, { label: 'b' }];

		expect(
			siteHeaderOf({
				buttons,
				actionsOrder: ['BUTTON_1', 'CART', 'BUTTON_0', 'SIGN_IN'],
			}).actionsOrder,
		).toEqual(['BUTTON_1', 'CART', 'BUTTON_0', 'SIGN_IN']);
	});

	it("puts the owner's buttons where their group was, in an order kept before", () => {
		expect(
			siteHeaderOf({
				buttons: [{ label: 'a' }, { label: 'b' }],
				actionsOrder: ['CART', 'BUTTONS', 'SIGN_IN'],
			}).actionsOrder,
		).toEqual(['CART', 'BUTTON_0', 'BUTTON_1', 'SIGN_IN']);
	});

	it('drops what is not there and puts last what the order does not say', () => {
		expect(
			siteHeaderOf({
				buttons: [{ label: 'a' }],
				actionsOrder: ['BUTTON_3', 'CART', 'CART', 'OTHER'],
			}).actionsOrder,
		).toEqual(['CART', 'BUTTON_0', 'SIGN_IN']);
	});

	it('keeps the size of its buttons, a known one', () => {
		expect(siteHeaderOf({ buttonSize: 'LARGE' }).buttonSize).toBe('LARGE');
		expect(siteHeaderOf({ buttonSize: 'HUGE' }).buttonSize).toBe('MEDIUM');
	});

	it('keeps where each part sits, only for parts and sides that exist', () => {
		expect(
			siteHeaderOf({
				aligns: { MENU: 'RIGHT', BRAND: 'MIDDLE', OTHER: 'LEFT' },
			}).aligns,
		).toEqual({ MENU: 'RIGHT' });
	});
});
