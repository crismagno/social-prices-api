import {
	ArrayMaxSize,
	ArrayMinSize,
	IsArray,
	IsMongoId,
	Matches,
} from 'class-validator';

// What Google calls a contact: "people/" and an id.
const CONTACT_ID: RegExp = /^people\/[A-Za-z0-9_-]+$/;

export class LinkGoogleContactDto {
	@Matches(CONTACT_ID)
	externalId: string;

	@IsMongoId()
	customerId: string;
}

export class FindGoogleContactCustomerDto {
	@Matches(CONTACT_ID)
	externalId: string;
}

/** Many contacts at once: the grid asks for the customers of the rows it lists. */
export class FindGoogleContactCustomersDto {
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(1000)
	@Matches(CONTACT_ID, { each: true })
	externalIds: string[];
}
