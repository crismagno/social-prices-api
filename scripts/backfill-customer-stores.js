/**
 * Fills `customer.storesIds` from the sales that already exist: every customer
 * belongs to each store they bought in. New sales do this by themselves.
 *
 *   node scripts/backfill-customer-stores.js            dry run: only counts
 *   node scripts/backfill-customer-stores.js --apply    writes
 *
 * Safe to run again: stores are added with $addToSet and nothing is removed.
 * Deleted sales (softDelete set) are ignored.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const BATCH_SIZE = 500;

async function main() {
	const apply = process.argv.includes('--apply');
	await mongoose.connect(process.env.MONGO_URI);
	const db = mongoose.connection.db;

	const cursor = db.collection('sales').aggregate(
		[
			{ $match: { softDelete: null } },
			{ $unwind: '$stores' },
			{
				$match: {
					'stores.customerId': { $ne: null },
					'stores.storeId': { $ne: null },
				},
			},
			{
				$group: {
					_id: '$stores.customerId',
					storesIds: { $addToSet: '$stores.storeId' },
				},
			},
		],
		{ allowDiskUse: true },
	);

	let customers = 0;
	let links = 0;
	let modified = 0;
	let batch = [];

	const flush = async () => {
		if (apply && batch.length) {
			const result = await db.collection('customers').bulkWrite(batch);
			modified += result.modifiedCount;
		}
		batch = [];
	};

	for await (const group of cursor) {
		customers += 1;
		links += group.storesIds.length;
		batch.push({
			updateOne: {
				filter: { _id: group._id },
				update: { $addToSet: { storesIds: { $each: group.storesIds } } },
			},
		});

		if (batch.length >= BATCH_SIZE) {
			await flush();
		}
	}

	await flush();

	console.log(
		JSON.stringify(
			{
				mode: apply ? 'APPLY' : 'DRY RUN',
				customersWithSales: customers,
				customerStoreLinks: links,
				customersModified: apply ? modified : 'n/a (dry run)',
			},
			null,
			2,
		),
	);
	await mongoose.disconnect();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
