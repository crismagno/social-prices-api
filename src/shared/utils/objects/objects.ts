export const parseAnyStringToObject = <T>(value: any): T => {
	return eval(`(${value})`);
};
