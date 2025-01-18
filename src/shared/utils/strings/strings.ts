import { map } from 'lodash';
import { Types } from 'mongoose';

import AddressEnum from '../../enums/address.enum';
import PhoneNumberEnum from '../../enums/phone-number.enum';
import { IAddress } from '../../interfaces/address.interface';
import { IPhoneNumber } from '../../interfaces/phone-number.interface';

export const arrayStringToObjectId = (values: string[]): Types.ObjectId[] =>
	map(values, (value: string) => new Types.ObjectId(value));

export const arrayObjectIdToString = (values: Types.ObjectId[]): string[] =>
	map(values, (value: Types.ObjectId) => value.toString());

export const createComma = (str: string): string =>
	str?.trim() ? ', ' + str : str;

export const createAddressName = (address: IAddress | any): string => {
	let addressName: string = '';

	if (address.countryCode || address.country) {
		addressName += address.countryCode ?? address.country.name;
	}

	if (address.stateCode || address.country) {
		addressName += createComma(address.stateCode ?? address.state.name);
	}

	if (address.city) {
		addressName += createComma(address.city);
	}

	if (address.district) {
		addressName += createComma(address.district);
	}

	if (address.zip) {
		addressName += createComma(address.zip);
	}

	if (address.address1) {
		addressName += createComma(address.address1);
	}

	if (address.types?.length) {
		const typesToString = address.types.reduce(
			(acc: string, curr: AddressEnum.Type, index: number) => {
				const lastIndexElement: number = address.types.length - 1;

				if (index !== lastIndexElement) {
					acc += `${AddressEnum.TypesLabels[curr]}, `;
				} else if (index === lastIndexElement) {
					acc += `${AddressEnum.TypesLabels[curr]}`;
				}

				return acc;
			},
			'',
		);

		addressName += ` (${typesToString})`;
	}

	return addressName;
};

export const messengersToString = (messengers: string[]): string =>
	messengers.reduce((acc, curr, index) => {
		if (index !== 0) {
			acc += `, ${
				PhoneNumberEnum.PhoneNumberMessengerLabels[
					curr as PhoneNumberEnum.PhoneNumberMessenger
				]
			}`;
		} else {
			acc =
				PhoneNumberEnum.PhoneNumberMessengerLabels[
					curr as PhoneNumberEnum.PhoneNumberMessenger
				];
		}

		return acc;
	}, '');

export const createPhoneNumberName = (phoneNumber: IPhoneNumber): string => {
	let phoneNumberName: string = '';

	if (phoneNumber?.type) {
		phoneNumberName += PhoneNumberEnum.TypeLabels[phoneNumber.type];
	}

	if (phoneNumber.number) {
		if (phoneNumber.type) {
			phoneNumberName += createComma(phoneNumber.number);
		} else {
			phoneNumberName += phoneNumber.number;
		}
	}

	if (phoneNumber.messengers.length) {
		phoneNumberName += `(${messengersToString(phoneNumber.messengers)})`;
	}

	return phoneNumberName;
};

export const hasSpecialCharacters = (value: string): boolean => {
	const regex: RegExp = /^[a-zA-Z0-9 ]*$/;
	return !regex.test(value);
};

export const parseToUpperAndUnderline = (value: string): string =>
	value?.trim().toLocaleUpperCase().split(' ').join('_');
