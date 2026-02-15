import * as ExcelJS from 'exceljs';

import {
	Injectable,
	Logger,
} from '@nestjs/common';

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
			row.getCell('D')?.text?.trim() !== 'SKU' ||
			row.getCell('E')?.text?.trim() !== 'Description' ||
			row.getCell('F')?.text?.trim() !== 'Price' ||
			row.getCell('G')?.text?.trim() !== 'Quantity' ||
			row.getCell('H')?.text?.trim() !== 'Stores' ||
			row.getCell('I')?.text?.trim() !== 'Categories' ||
			row.getCell('J')?.text?.trim() !== 'Tags' ||
			row.getCell('K')?.text?.trim() !== 'Is Active' ||
			row.getCell('L')?.text?.trim() !== 'Details' ||
			row.getCell('M')?.text?.trim() !== 'Brand' ||
			row.getCell('N')?.text?.trim() !== 'Release Date' ||
			row.getCell('O')?.text?.trim() !== 'Expiration Date' ||
			row.getCell('P')?.text?.trim() !== 'Colors' ||
			row.getCell('Q')?.text?.trim() !== 'Dimension Size' ||
			row.getCell('R')?.text?.trim() !== 'Dimension Height' ||
			row.getCell('S')?.text?.trim() !== 'Dimension Width' ||
			row.getCell('T')?.text?.trim() !== 'Dimension Length' ||
			row.getCell('U')?.text?.trim() !== 'Dimension Depth' ||
			row.getCell('V')?.text?.trim() !== 'Dimension Diameter' ||
			row.getCell('W')?.text?.trim() !== 'Dimension Thickness' ||
			row.getCell('X')?.text?.trim() !== 'Dimension Volume' ||
			row.getCell('Y')?.text?.trim() !== 'Dimension Weight'
		) {
			throw new Error('Invalid template.');
		}
	}

	// #endregion
}
