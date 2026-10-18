import { GooglePeopleApiError } from './google-contacts.types';
import { GooglePeopleClient } from './google-contacts.client';

const response = (body: any, ok = true, status = 200): any => ({
	ok,
	status,
	json: async () => body,
});

describe('GooglePeopleClient', () => {
	const client = new GooglePeopleClient();
	const fetchMock = jest.fn();

	beforeEach(() => {
		fetchMock.mockReset();
		(global as any).fetch = fetchMock;
	});

	describe('listConnections', () => {
		it('requests a page with the bearer token and no sync token', async () => {
			fetchMock.mockResolvedValue(
				response({
					connections: [{ resourceName: 'people/c1' }],
					nextPageToken: 'p2',
				}),
			);

			const page = await client.listConnections('AT', {});

			const [url, init] = fetchMock.mock.calls[0];
			const parsed = new URL(url);

			expect(parsed.pathname).toBe('/v1/people/me/connections');
			expect(parsed.searchParams.get('pageSize')).toBe('1000');
			expect(parsed.searchParams.get('pageToken')).toBeNull();
			expect(parsed.searchParams.get('requestSyncToken')).toBeNull();
			expect(init.headers.Authorization).toBe('Bearer AT');
			expect(page).toEqual({
				connections: [{ resourceName: 'people/c1' }],
				nextPageToken: 'p2',
			});
		});

		it('sends the page token when continuing', async () => {
			fetchMock.mockResolvedValue(response({}));

			await client.listConnections('AT', { pageToken: 'P' });

			expect(
				new URL(fetchMock.mock.calls[0][0]).searchParams.get('pageToken'),
			).toBe('P');
		});

		it('normalises an empty response', async () => {
			fetchMock.mockResolvedValue(response({}));

			await expect(client.listConnections('AT', {})).resolves.toEqual({
				connections: [],
				nextPageToken: null,
			});
		});

		it('keeps Googles status, reason and message on a 403', async () => {
			fetchMock.mockResolvedValue(
				response(
					{
						error: {
							status: 'PERMISSION_DENIED',
							message: 'People API has not been used in project 1 before.',
							details: [{ reason: 'SERVICE_DISABLED' }],
						},
					},
					false,
					403,
				),
			);

			const error = await client.listConnections('AT', {}).catch((e) => e);

			expect(error).toBeInstanceOf(GooglePeopleApiError);
			expect(error).toMatchObject({ status: 403, reason: 'SERVICE_DISABLED' });
			expect(error.message).toContain('SERVICE_DISABLED');
		});

		it('throws on any other failure', async () => {
			fetchMock.mockResolvedValue(response({ error: {} }, false, 500));

			await expect(client.listConnections('AT', {})).rejects.toThrow(
				'People API error 500',
			);
		});
	});

	describe('getByResourceNames', () => {
		const names = (n: number) =>
			Array.from({ length: n }, (_, i) => `people/c${i}`);

		it('fetches in batches of 200 and returns only the people found', async () => {
			fetchMock
				.mockResolvedValueOnce(
					response({
						responses: [
							{ person: { resourceName: 'people/c0' } },
							{ httpStatusCode: 404, requestedResourceName: 'people/c1' },
						],
					}),
				)
				.mockResolvedValueOnce(
					response({
						responses: [{ person: { resourceName: 'people/c200' } }],
					}),
				);

			const people = await client.getByResourceNames('AT', names(250));

			expect(fetchMock).toHaveBeenCalledTimes(2);

			const first = new URL(fetchMock.mock.calls[0][0]);
			expect(first.pathname).toBe('/v1/people:batchGet');
			expect(first.searchParams.getAll('resourceNames')).toHaveLength(200);
			expect(
				new URL(fetchMock.mock.calls[1][0]).searchParams.getAll(
					'resourceNames',
				),
			).toHaveLength(50);
			expect(people.map((p) => p.resourceName)).toEqual([
				'people/c0',
				'people/c200',
			]);
		});

		it('does not call Google for an empty list', async () => {
			await expect(client.getByResourceNames('AT', [])).resolves.toEqual([]);
			expect(fetchMock).not.toHaveBeenCalled();
		});

		it('throws the typed error when Google refuses the batch', async () => {
			fetchMock.mockResolvedValue(
				response(
					{ error: { details: [{ reason: 'RATE_LIMIT_EXCEEDED' }] } },
					false,
					429,
				),
			);

			await expect(
				client.getByResourceNames('AT', ['people/c1']),
			).rejects.toBeInstanceOf(GooglePeopleApiError);
		});
	});
});
