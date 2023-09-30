export const isValidEmail = (email: string): boolean => {
	const regexEmail: RegExp =
		/^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return regexEmail.test(email);
};

export const makeRandomCode = (lengthCode: number = 6): string => {
	let result: string = '';

	const characters: string = `${process.env.CHARACTERS}`;

	const charactersLength: number = characters.length;

	for (let i = 0; i < lengthCode; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}

	return result.toUpperCase();
};
