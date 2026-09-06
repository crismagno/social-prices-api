import DynamicFieldEnum from './dynamic-field.enum';

export type TDynamicFieldValue = boolean | string | number | null;

export interface IDynamicField {
	name: string;
	type: DynamicFieldEnum.Type;
	value: TDynamicFieldValue;
}
