import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';

import { schemasName } from '../../src/infra/database/mongo/schemas';
import HashCrypt from '../../src/infra/hash-crypt/hash-crypt';
import { CountersService } from '../../src/modules/counters/counters.service';
import { CustomersService } from '../../src/modules/customers/customers.service';
import { EmployeesService } from '../../src/modules/employees/employees.service';
import { FilesUploadsService } from '../../src/modules/files-uploads/files-uploads.service';
import { FilesService } from '../../src/modules/files/files-service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { ProductItemsService } from '../../src/modules/product-items/product-items.service';
import { ProductsService } from '../../src/modules/products/products.service';
import { SalesValidationService } from '../../src/modules/sales/sales-validation.service';
import { SalesService } from '../../src/modules/sales/sales.service';
import { SocketsGateway } from '../../src/modules/sockets/sockets.gateway';
import { StoresService } from '../../src/modules/stores/stores.service';
import { TagsService } from '../../src/modules/tags/tags.service';
import { UsersService } from '../../src/modules/users/users.service';

describe('SalesService - find', () => {
	let salesService: SalesService;
	let saleModel: { findById: jest.Mock };

	beforeEach(async () => {
		saleModel = { findById: jest.fn() };

		/**
		 * findById only reaches the sale model and the users service. The other
		 * collaborators are injected as empty doubles just to satisfy Nest.
		 */
		const collaborators = [
			UsersService,
			NotificationsService,
			StoresService,
			CustomersService,
			ProductsService,
			ProductItemsService,
			CountersService,
			SalesValidationService,
			TagsService,
			SocketsGateway,
			FilesUploadsService,
			FilesService,
			EmployeesService,
			HashCrypt,
		];

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				SalesService,
				{ provide: getModelToken(schemasName.sale), useValue: saleModel },
				...collaborators.map((provide) => ({ provide, useValue: {} })),
			],
		}).compile();

		salesService = module.get<SalesService>(SalesService);
	});

	it('returns null when the sale does not exist', async () => {
		saleModel.findById.mockResolvedValue(null);

		const result = await salesService.findById('non-existing-id');

		expect(result).toBeNull();
		expect(saleModel.findById).toHaveBeenCalledWith('non-existing-id');
	});
});
