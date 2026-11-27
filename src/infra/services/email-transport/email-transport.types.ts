export interface ISendEmailParams {
	from?: string;
	to: string[] | string;
	subject: string;
	text?: string;
	html?: any;
	/** Who an answer to this e-mail goes to, when not who sent it. */
	replyTo?: string;
}
