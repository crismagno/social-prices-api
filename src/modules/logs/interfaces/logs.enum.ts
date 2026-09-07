namespace LogsEnum {
	export enum Type {
		ERROR = 'ERROR',
		INFO = 'INFO',
		WARNING = 'WARNING',
		SUCCESS = 'SUCCESS',
	}

	export const TypeLabels = {
		[Type.ERROR]: 'Error',
		[Type.INFO]: 'Info',
		[Type.WARNING]: 'Warning',
		[Type.SUCCESS]: 'Success',
	};
}

export default LogsEnum;
