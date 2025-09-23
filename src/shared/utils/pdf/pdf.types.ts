import * as puppeteer from 'puppeteer';

export interface IGeneratePdfBufferParams {
	pdfOptions?: puppeteer.PDFOptions;
	waitForOptions?: puppeteer.WaitForOptions;
}
