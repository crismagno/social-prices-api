import {
	isRichText,
	richTextToChatText,
	richTextToPlain,
	sanitizeRichText,
} from './rich-text';

describe('rich text', () => {
	it('keeps a plain text as it was typed', () => {
		expect(sanitizeRichText('Linha 1\nLinha 2 <3')).toBe('Linha 1\nLinha 2 <3');
		expect(isRichText('Linha 1')).toBe(false);
	});

	it('keeps the formatting of the editor', () => {
		const html: string =
			'<p style="text-align: center"><strong>Novo</strong> <em>linho</em> <u>azul</u></p><ul><li>um</li></ul><ol start="2"><li>dois</li></ol>';

		// The style comes back written without spaces.
		expect(sanitizeRichText(html)).toBe(
			html.replace('text-align: center', 'text-align:center'),
		);
	});

	it('drops scripts, events, styles other than alignment and unsafe links', () => {
		const clean: string = sanitizeRichText(
			'<p onclick="x()" style="color:red;text-align:right">oi<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">a</a></p>',
		);

		expect(clean).not.toMatch(/script|onclick|onerror|img|javascript|color/);
		expect(clean).toContain('text-align:right');
	});

	it('opens links apart and safely', () => {
		expect(sanitizeRichText('<p><a href="https://loja.com">site</a></p>')).toBe(
			'<p><a href="https://loja.com" target="_blank" rel="noopener noreferrer nofollow">site</a></p>',
		);
	});

	it('turns an editor left empty into nothing', () => {
		expect(sanitizeRichText('<p></p>')).toBeNull();
		expect(sanitizeRichText('   ')).toBeNull();
	});

	it('gives the words without formatting', () => {
		expect(
			richTextToPlain(
				'<p><strong>Bolsa</strong> &amp; carteira</p><ul><li>couro</li><li>lona</li></ul>',
			),
		).toBe('Bolsa & carteira\ncouro\nlona');
	});
});

describe('rich text as a chat message', () => {
	const html: string =
		'<p><strong>Olá</strong>, <em>tudo</em> <s>mal</s> bem?</p><ul><li><p>um</p></li><li><p>dois</p></li></ul><ol start="3"><li><p>três</p></li></ol><blockquote><p>frase</p></blockquote><p><a href="https://loja.com">veja</a> &amp; <code>X1</code></p>';

	it('writes WhatsApp marks for WhatsApp', () => {
		expect(richTextToChatText(html, 'whatsapp')).toBe(
			'*Olá*, _tudo_ ~mal~ bem?\n\n• um\n• dois\n\n3. três\n> frase\n(https://loja.com) & `X1`'.replace(
				'(https://loja.com)',
				'veja (https://loja.com)',
			),
		);
	});

	it('leaves the marks out where the channel has none', () => {
		const text: string = richTextToChatText(html, 'plain');

		expect(text).toContain('Olá, tudo mal bem?');
		expect(text).toContain('• um\n• dois');
		expect(text).toContain('3. três');
		expect(text).not.toMatch(/[*_~`<]/);
	});

	it('keeps the spaces outside the marks', () => {
		expect(
			richTextToChatText('<p><strong>oi </strong>você</p>', 'whatsapp'),
		).toBe('*oi* você');
	});

	it('sends a plain text as it was typed', () => {
		expect(richTextToChatText('Oi {{customer.name}}\n*já*', 'whatsapp')).toBe(
			'Oi {{customer.name}}\n*já*',
		);
	});
});
