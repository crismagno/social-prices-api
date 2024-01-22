import { Injectable, Logger } from '@nestjs/common';

import { ISendEmailParams } from './email-transport.types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nodemailer = require('nodemailer');

@Injectable()
export default class EmailTransport {
	//#region Private Properties

	private readonly _logger: Logger;

	private readonly _transporter: any;

	private readonly _emailUser: string = process.env.EMAIL_USER;

	private readonly _emailTest: string = process.env.EMAIL_TEST;

	private readonly _emailHost: string = process.env.EMAIL_HOST;

	private readonly _emailPort: number = +process.env.EMAIL_PORT;

	private readonly _emailPass: string = process.env.EMAIL_PASS;

	//#endregion

	//#region Constructor

	constructor() {
		try {
			this._logger = new Logger(EmailTransport.name);

			this._transporter = nodemailer.createTransport({
				host: this._emailHost,
				port: this._emailPort,
				secure: true,
				auth: {
					user: this._emailUser,
					pass: this._emailPass,
				},
				tls: { rejectUnauthorized: true, ciphers: 'SSLv3' },
			});
		} catch (error: any) {
			this._logger.error(error);
		}
	}

	//#endregion

	//#region Public Methods

	public async sendEmail(params: ISendEmailParams): Promise<string | null> {
		try {
			const info = await this._transporter.sendMail({
				from: params.from ?? this._emailUser,
				to: params.to,
				subject: params.subject,
				text: params.text,
				html: params.html,
			});

			return info.messageId;
		} catch (error: any) {
			this._logger.error(error);
			return null;
		}
	}

	public async sendEmailTest(): Promise<string | null> {
		try {
			const result: string | null = await this.sendEmail({
				from: this._emailUser,
				to: this._emailTest,
				subject: 'Test',
				text: 'Text........',
				html: '<b>Test----</b>',
			});

			return result;
		} catch (error: any) {
			this._logger.error(error);
			return null;
		}
	}

	//#endregion
}
