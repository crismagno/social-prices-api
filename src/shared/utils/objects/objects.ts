export const parseAnyStringToObject = <T>(value: any): T => {
	return eval(`(${value})`);
};

export const checkIsJson = (value: string): boolean => {
	try {
		const parsed: any = JSON.parse(value);

		if (Array.isArray(parsed)) {
			return true;
		}

		if (typeof parsed === 'object' && parsed !== null) {
			return true;
		}
		return false;
	} catch {
		return false;
	}
};

export const parseStringToJsonIfNeed = <T>(value: any): T => {
	if (typeof value === 'string' && checkIsJson(value)) {
		return JSON.parse(value);
	}

	return value;
};

export const parsePropertiesToJsonIfNeed = (obj: any): any => {
	const newObject = {};

	for (const key in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, key)) {
			newObject[key] = parseStringToJsonIfNeed(obj[key]);
		}
	}

	return newObject;
};

export const unFreezeData = <T>(data: T): T => {
	return JSON.parse(JSON.stringify(data));
};
