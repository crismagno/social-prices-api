import * as ExcelJS from 'exceljs';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SalesValidationService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor() {
		this._logger = new Logger(SalesValidationService.name);
	}

	// #endregion

	// #region Public Methods

	public validateSalesUploadTemplate(row: ExcelJS.Row): void {
		if (
			row.getCell('A')?.text?.trim() !== 'Uniq Name *' ||
			row.getCell('B')?.text?.trim() !== 'Name *' ||
			row.getCell('C')?.text?.trim() !== 'Email' ||
			row.getCell('D')?.text?.trim() !== 'Birth Date' ||
			row.getCell('E')?.text?.trim() !== 'Gender' ||
			row.getCell('F')?.text?.trim() !== 'About' ||
			row.getCell('G')?.text?.trim() !== 'Country' ||
			row.getCell('H')?.text?.trim() !== 'State' ||
			row.getCell('I')?.text?.trim() !== 'City' ||
			row.getCell('J')?.text?.trim() !== 'Zip Code' ||
			row.getCell('K')?.text?.trim() !== 'Address1' ||
			row.getCell('L')?.text?.trim() !== 'Address2' ||
			row.getCell('M')?.text?.trim() !== 'District' ||
			row.getCell('N')?.text?.trim() !== 'Address Description' ||
			row.getCell('O')?.text?.trim() !== 'Address Types' ||
			row.getCell('P')?.text?.trim() !== 'Phone Type' ||
			row.getCell('Q')?.text?.trim() !== 'Phone Number' ||
			row.getCell('R')?.text?.trim() !== 'Phone Messengers' ||
			row.getCell('S')?.text?.trim() !== 'Selected Products' ||
			row.getCell('T')?.text?.trim() !== 'Discount' ||
			row.getCell('U')?.text?.trim() !== 'Shipping' ||
			row.getCell('V')?.text?.trim() !== 'Tax' ||
			row.getCell('W')?.text?.trim() !== 'Payments' ||
			row.getCell('X')?.text?.trim() !== 'Note' ||
			row.getCell('Y')?.text?.trim() !== 'Tags' ||
			row.getCell('Z')?.text?.trim() !== 'Sale Status' ||
			row.getCell('AA')?.text?.trim() !== 'Payment Status' ||
			row.getCell('AB')?.text?.trim() !== 'Delivery Date'
		) {
			throw new Error('Invalid template.');
		}
	}

	// #endregion
}
