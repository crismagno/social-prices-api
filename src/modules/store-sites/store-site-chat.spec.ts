import StoreSitesEnum from './interfaces/store-sites.enum';
import { siteChatOf } from './store-site-chat';

const Field = StoreSitesEnum.ChatFieldMode;
const F = StoreSitesEnum.ChatCustomerField;

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
			sessionMinutes: 60,
			extraFields: [
				{ field: F.EMAIL, isRequired: true },
				{ field: F.PHONE, isRequired: false },
			],
			fieldsVersion: 2,
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
				sessionMinutes: 30,
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
			sessionMinutes: 30,
			extraFields: [{ field: F.PHONE, isRequired: true }],
			fieldsVersion: 2,
		});
	});

	it('keeps the customer fields the owner chose, each once, required or not', () => {
		const chat = siteChatOf({
			fieldsVersion: 2,
			extraFields: [
				{ field: F.CPF, isRequired: true },
				{ field: F.BIRTH_DATE },
				{ field: F.CPF, isRequired: false },
				{ field: 'SHOE_SIZE', isRequired: true },
				{ label: 'Empresa', type: 'TEXT' },
				{ field: F.ADDRESS, isRequired: 'yes' },
			],
		});

		expect(chat.extraFields).toEqual([
			{ field: F.CPF, isRequired: true },
			{ field: F.BIRTH_DATE, isRequired: false },
			{ field: F.ADDRESS, isRequired: false },
		]);
	});

	it('puts the email and phone of an older chat in front of its other fields', () => {
		const chat = siteChatOf({
			emailField: Field.OPTIONAL,
			phoneField: Field.HIDDEN,
			extraFields: [{ field: F.CPF, isRequired: true }],
		});

		expect(chat.extraFields).toEqual([
			{ field: F.EMAIL, isRequired: false },
			{ field: F.CPF, isRequired: true },
		]);
	});

	it('reads how the email and phone are asked from the list', () => {
		const chat = siteChatOf({
			fieldsVersion: 2,
			emailField: Field.REQUIRED,
			extraFields: [
				{ field: F.CPF, isRequired: true },
				{ field: F.PHONE, isRequired: false },
			],
		});

		expect(chat.emailField).toBe(Field.HIDDEN);
		expect(chat.phoneField).toBe(Field.OPTIONAL);
	});

	it.each([
		[1, 5],
		[5000, 1440],
		[45.6, 46],
		['muito', 60],
	])(
		'keeps the time of a chat between 5 minutes and a day: %p gives %p',
		(given, kept) => {
			expect(siteChatOf({ sessionMinutes: given }).sessionMinutes).toBe(kept);
		},
	);

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

	it('keeps a first message written in the editor, cleaned', () => {
		expect(
			siteChatOf({
				greeting: '<p><strong>Oi!</strong> 😀<script>x()</script></p>',
			}).greeting,
		).toBe('<p><strong>Oi!</strong> 😀</p>');
	});

	it('keeps only the words of a formatted first message too long', () => {
		const greeting: string = siteChatOf({
			greeting: `<p><strong>${'a'.repeat(400)}</strong></p>`,
		}).greeting;

		expect(greeting).toBe('a'.repeat(300));
	});
});
