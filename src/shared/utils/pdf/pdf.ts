import * as puppeteer from 'puppeteer';

import { getHtmlFromTemplate } from '../templates/templates';
import { IGetHtmlFromTemplateParams } from '../templates/templates.types';
import { IGeneratePdfBufferParams } from './pdf.types';

export const generatePdfBuffer = async ({
	getHtmlFromTemplateParams,
	generatePdfBufferParams,
}: {
	getHtmlFromTemplateParams: IGetHtmlFromTemplateParams;
	generatePdfBufferParams?: IGeneratePdfBufferParams;
}): Promise<Buffer> => {
	const html: string = getHtmlFromTemplate(getHtmlFromTemplateParams);

	const browser = await puppeteer.launch({
		headless: 'new',
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		executablePath:
			process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
	});

	const page: puppeteer.Page = await browser.newPage();
	await page.setContent(
		html,
		generatePdfBufferParams?.waitForOptions ?? { waitUntil: 'networkidle0' },
	);

	const pdfBuffer: Buffer = await page.pdf(
		generatePdfBufferParams?.pdfOptions ?? { format: 'A4' },
	);

	await browser.close();

	return pdfBuffer;
};
