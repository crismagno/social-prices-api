import * as ExcelJS from 'exceljs';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmployeesValidationService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor() {
		this._logger = new Logger(EmployeesValidationService.name);
	}

	// #endregion

	// #region Public Methods

	public validateEmployeesUploadTemplate(row: ExcelJS.Row): void {
		if (
			row.getCell('A')?.text?.trim() !== 'Name *' ||
			row.getCell('B')?.text?.trim() !== 'Email *' ||
			row.getCell('C')?.text?.trim() !== 'Password *' ||
			row.getCell('D')?.text?.trim() !== 'Birth Date' ||
			row.getCell('E')?.text?.trim() !== 'Gender' ||
			row.getCell('F')?.text?.trim() !== 'Tags' ||
			row.getCell('G')?.text?.trim() !== 'Level' ||
			row.getCell('H')?.text?.trim() !== 'About' ||
			row.getCell('I')?.text?.trim() !== 'Country' ||
			row.getCell('J')?.text?.trim() !== 'State' ||
			row.getCell('K')?.text?.trim() !== 'City' ||
			row.getCell('L')?.text?.trim() !== 'Zip Code' ||
			row.getCell('M')?.text?.trim() !== 'Address1' ||
			row.getCell('N')?.text?.trim() !== 'Address2' ||
			row.getCell('O')?.text?.trim() !== 'District' ||
			row.getCell('P')?.text?.trim() !== 'Address Description' ||
			row.getCell('Q')?.text?.trim() !== 'Address Types' ||
			row.getCell('R')?.text?.trim() !== 'Phone Type' ||
			row.getCell('S')?.text?.trim() !== 'Phone Number' ||
			row.getCell('T')?.text?.trim() !== 'Phone Messengers'
		) {
			throw new Error('Invalid template.');
		}
	}

	// #endregion
}
