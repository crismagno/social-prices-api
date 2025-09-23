import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import * as path from 'path';

import TemplatesEnum from './templates.enum';
import { IGetHtmlFromTemplateParams } from './templates.types';

export const getTemplatePath = (
	relativePath: TemplatesEnum.RelativePath,
): string => {
	const fullPath: string = path.join(process.cwd(), 'templates', relativePath);

	if (!fs.existsSync(fullPath)) {
		throw new Error(`Template not found: ${fullPath}`);
	}

	return fullPath;
};

export const getHtmlFromTemplate = ({
	relativePath,
	data,
	compileOptions,
}: IGetHtmlFromTemplateParams): string => {
	const templatePath: string = getTemplatePath(relativePath);

	const templateHtml: string = fs.readFileSync(templatePath, 'utf8');

	const template: HandlebarsTemplateDelegate<any> = Handlebars.compile(
		templateHtml,
		compileOptions,
	);

	const html: string = template(data);

	return html;
};
