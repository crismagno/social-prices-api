import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteChatOf } from './store-site-chat';

const Field = StoreSitesEnum.ChatFieldMode;

describe('siteChatOf', () => {
	it('is off for a site saved before it existed', () => {
		expect(siteChatOf(undefined)).toEqual({
			isActive: false,
			position: StoreSitesEnum.ChatPosition.RIGHT,
			icon: StoreSitesEnum.ChatIcon.MESSAGE,
			buttonLabel: null,
			title: null,
			greeting: null,
			emailField: Field.REQUIRED,
			phoneField: Field.OPTIONAL,
		});
	});

	it('keeps what the owner chose, with texts trimmed', () => {
		expect(
			siteChatOf({
				isActive: true,
				position: StoreSitesEnum.ChatPosition.LEFT,
				icon: StoreSitesEnum.ChatIcon.HEART,
				buttonLabel: ' Fale com a gente ',
				title: ' Atendimento ',
				greeting: ' Oi! Como podemos ajudar? ',
				emailField: Field.HIDDEN,
				phoneField: Field.REQUIRED,
			}),
		).toEqual({
			isActive: true,
			position: StoreSitesEnum.ChatPosition.LEFT,
			icon: StoreSitesEnum.ChatIcon.HEART,
			buttonLabel: 'Fale com a gente',
			title: 'Atendimento',
			greeting: 'Oi! Como podemos ajudar?',
			emailField: Field.HIDDEN,
			phoneField: Field.REQUIRED,
		});
	});

	it('cuts texts too long and falls back for unknown choices', () => {
		const chat = siteChatOf({
			buttonLabel: 'x'.repeat(80),
			greeting: 'y'.repeat(900),
			position: 'TOP',
			icon: 'ROCKET',
			emailField: 'MAYBE',
		});

		expect(chat.buttonLabel).toHaveLength(30);
		expect(chat.greeting).toHaveLength(300);
		expect(chat.position).toBe(StoreSitesEnum.ChatPosition.RIGHT);
		expect(chat.icon).toBe(StoreSitesEnum.ChatIcon.MESSAGE);
		expect(chat.emailField).toBe(Field.REQUIRED);
	});

	it('survives garbage', () => {
		expect(siteChatOf('x').isActive).toBe(false);
		expect(siteChatOf({ isActive: 'yes' }).isActive).toBe(false);
	});
});
