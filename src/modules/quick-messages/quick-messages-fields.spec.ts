import {
	buildFieldValues,
	listFieldInfo,
	renderTemplate,
} from './quick-messages-fields';

const customer: any = {
	name: 'Ana Souza',
	email: 'ana@x.com',
	cpf: '123',
	cnpj: null,
	idNumber: null,
	about: null,
	birthDate: null,
	phoneNumbers: [{ number: '11999990000' }],
	addresses: [
		{
			address1: 'Rua A, 10',
			address2: 'Ap 2',
			district: 'Centro',
			city: 'Campinas',
			state: { code: 'SP', name: 'São Paulo' },
			zip: '13000-000',
		},
	],
};
const contact: any = { name: 'João Tg' };
const employee: any = {
	name: 'Bia',
	username: 'bia',
	email: 'bia@x.com',
	phoneNumbers: [],
};
const user: any = {
	name: 'Dono',
	username: 'dono',
	email: 'dono@x.com',
	phoneNumbers: [],
};

describe('quick-messages-fields', () => {
	it('replaces known fields and keeps unknown ones literally', () => {
		expect(
			renderTemplate('Oi {cliente.nome}, {foo.bar}!', {
				'cliente.nome': 'Ana',
			}),
		).toBe('Oi Ana, {foo.bar}!');
	});

	it('renders a known empty field as blank', () => {
		const values = buildFieldValues({
			customer: { ...customer, cpf: null },
			contact: null,
			employee: null,
			user,
		});

		expect(renderTemplate('CPF: {cliente.cpf}', values)).toBe('CPF: ');
	});

	it('falls back to the channel contact name when no customer is linked', () => {
		const values = buildFieldValues({
			customer: null,
			contact,
			employee: null,
			user,
		});

		expect(values['cliente.nome']).toBe('João Tg');
		expect(values['cliente.email']).toBe('');
	});

	it('uses the employee when present, the owner user otherwise', () => {
		expect(
			buildFieldValues({ customer, contact: null, employee, user })[
				'funcionario.nome'
			],
		).toBe('Bia');
		expect(
			buildFieldValues({ customer, contact: null, employee: null, user })[
				'funcionario.nome'
			],
		).toBe('Dono');
	});

	it('formats birth date as DD/MM/YYYY and reads the first address and phone', () => {
		const values = buildFieldValues({
			customer: { ...customer, birthDate: new Date('1990-03-07T12:00:00Z') },
			contact: null,
			employee: null,
			user,
		});

		expect(values['cliente.nascimento']).toBe('07/03/1990');
		expect(values['cliente.endereco.cidade']).toBe('Campinas');
		expect(values['cliente.endereco.estado']).toBe('São Paulo');
		expect(values['cliente.telefone']).toBe('11999990000');
	});

	it('has every listed field in the values', () => {
		const values = buildFieldValues({
			customer: null,
			contact: null,
			employee: null,
			user: null,
		});

		for (const field of listFieldInfo()) {
			expect(values[field.key]).toBe('');
		}
	});

	it('never exposes sensitive keys', () => {
		const keys: string[] = listFieldInfo().map((f) => f.key);

		expect(keys).toHaveLength(18);
		expect(
			keys.some((k) => /senha|password|_id|avatar|upload|tags/i.test(k)),
		).toBe(false);
	});

	it('tolerates spaces inside braces', () => {
		expect(renderTemplate('{ cliente.nome }', { 'cliente.nome': 'Ana' })).toBe(
			'Ana',
		);
	});
});
