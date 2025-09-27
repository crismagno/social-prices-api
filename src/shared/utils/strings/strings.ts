import { map } from 'lodash';
import mongoose from 'mongoose';

import { IUser } from '../../../modules/users/interfaces/user.interface';
import AddressEnum from '../../common/address/address.enum';
import { IAddress } from '../../common/address/address.interface';
import PhoneNumberEnum from '../../common/phone/phone-number.enum';
import { IPhoneNumber } from '../../common/phone/phone-number.interface';

export const arrayStringToObjectId = (
	values: string[],
): mongoose.Types.ObjectId[] =>
	map(values, (value: string) => new mongoose.Types.ObjectId(value));

export const arrayObjectIdToString = (
	values: mongoose.Types.ObjectId[],
): string[] =>
	map(values, (value: mongoose.Types.ObjectId) => value.toString());

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

export const formatterMoney = (value: any): string =>
	`R$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const parserMoney = (value: any) =>
	value?.replace(/\R\$\s?|(,*)/g, '') as unknown as number;

export const getUserName = (user: IUser): string =>
	user?.name || user.username || '';

export const formatToMoneyDecimal = (
	value: number,
	decimal: number = 2,
): string => `R$ ${value?.toFixed(decimal) ?? 0}`;
