export const getPercentageByValue = (
	partialValue: number,
	totalValue: number,
): number => (100 * partialValue) / totalValue;

export const getValueByPercentage = (
	percentageValue: number,
	totalValue: number,
): number => (percentageValue * totalValue) / 100;
