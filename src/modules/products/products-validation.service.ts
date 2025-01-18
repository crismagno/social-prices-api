import * as ExcelJS from 'exceljs';

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ProductsValidationService {
	// #region Private Properties

	private readonly _logger: Logger;

	// #endregion

	// #region Constructor

	constructor() {
		this._logger = new Logger(ProductsValidationService.name);
	}

	// #endregion

	// #region Public Methods

	public validateProductsUploadTemplate(row: ExcelJS.Row): void {
		if (
			row.getCell('A')?.text?.trim() !== 'Image' ||
			row.getCell('B')?.text?.trim() !== 'Name •' ||
			row.getCell('C')?.text?.trim() !== 'Barcode' ||
			row.getCell('D')?.text?.trim() !== 'Description' ||
			row.getCell('E')?.text?.trim() !== 'Price' ||
			row.getCell('F')?.text?.trim() !== 'Quantity' ||
			row.getCell('G')?.text?.trim() !== 'Stores' ||
			row.getCell('H')?.text?.trim() !== 'Categories' ||
			row.getCell('I')?.text?.trim() !== 'Tags' ||
			row.getCell('J')?.text?.trim() !== 'Is Active' ||
			row.getCell('K')?.text?.trim() !== 'Details'
		) {
			throw new Error('Invalid template.');
		}
	}

	// #endregion
}
