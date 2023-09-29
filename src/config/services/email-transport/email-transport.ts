import { Injectable } from '@nestjs/common';

import { ISendEmailParams } from './email-transport.types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer');

@Injectable()
export default class EmailTransport {
	//#region Private Properties

	private readonly _transporter: any;

	private readonly _userEmail: string;

	//#endregion

	//#region Constructor

	constructor() {
		this._userEmail = process.env.EMAIL_USER;

		this._transporter = nodemailer.createTransport({
			host: process.env.EMAIL_HOST,
			port: +process.env.EMAIL_PORT,
			secure: true,
			auth: {
				user: this._userEmail,
				pass: process.env.EMAIL_PASS,
			},
			tls: { rejectUnauthorized: true, ciphers: 'SSLv3' },
		});
	}
	//#endregion

	//#region Public Methods

	public async sendEmail(params: ISendEmailParams): Promise<string | null> {
		try {
			const info = await this._transporter.sendMail({
				from: params.from ?? this._userEmail,
				to: params.to,
				subject: params.subject,
				text: params.text,
				html: params.html,
			});

			return info.messageId;
		} catch (error) {
			return null;
		}
	}

	public async sendEmailTest(): Promise<string | null> {
		const result: string | null = await this.sendEmail({
			from: this._userEmail,
			to: 'cristhoferbieber@gmail.com',
			subject: 'Test',
			text: 'Text........',
			html: '<b>Test----</b>',
		});

		return result;
	}

	//#endregion
}
