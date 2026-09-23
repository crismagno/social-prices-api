namespace AuthEnum {
	export enum RequestProps {
		AUTH_PAYLOAD = 'AUTH_PAYLOAD',
	}

	export enum AuthErrors {
		UNAUTHORIZED = 'UNAUTHORIZED',
	}

	export enum AuthTypes {
		NO_TOKEN = 'NO_TOKEN',
		PAYLOAD_ERROR = 'PAYLOAD_ERROR',
		LOGIN_VALIDATION = 'LOGIN_VALIDATION',
		WRONG_IDENTITY = 'WRONG_IDENTITY',
		SIGN_IN_NOT_VALIDATED = 'SIGN_IN_NOT_VALIDATED',
	}

	export enum PayloadType {
		USER = 'USER',
		MANAGER = 'MANAGER',
	}
}

export default AuthEnum;
