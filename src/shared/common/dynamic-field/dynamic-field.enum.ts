namespace DynamicFieldEnum {
	export enum Type {
		BOOLEAN = 'BOOLEAN',
		STRING = 'STRING',
		INT = 'INT',
		DECIMAL = 'DECIMAL',
	}

	/**
	 * User facing labels. They intentionally avoid programming jargon.
	 */
	export const TypeLabels = {
		[Type.BOOLEAN]: 'True/False',
		[Type.STRING]: 'Characters',
		[Type.INT]: 'Integer',
		[Type.DECIMAL]: 'Decimal',
	};
}

export default DynamicFieldEnum;
