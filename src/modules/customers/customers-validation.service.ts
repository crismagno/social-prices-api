import * as ExcelJS from 'exceljs';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CustomersValidationService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor() {
		this._logger = new Logger(CustomersValidationService.name);
	}

	// #endregion

	// #region Public Methods

	public validateCustomersUploadTemplate(row: ExcelJS.Row): void {
		if (
			row.getCell('A')?.text?.trim() !== 'Name *' ||
			row.getCell('B')?.text?.trim() !== 'Email' ||
			row.getCell('C')?.text?.trim() !== 'Birth Date' ||
			row.getCell('D')?.text?.trim() !== 'Gender' ||
			row.getCell('E')?.text?.trim() !== 'Tags' ||
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
			row.getCell('R')?.text?.trim() !== 'Phone Messengers'
		) {
			throw new Error('Invalid template.');
		}
	}

	// #endregion
}
