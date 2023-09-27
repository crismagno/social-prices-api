export interface ISendEmailParams {
	from: string;
	to: string[] | string;
	subject: string;
	text: string;
	html: any;
}
