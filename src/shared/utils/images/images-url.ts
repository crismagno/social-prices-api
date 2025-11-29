export const getImageLocalUrl = (filename: string): string =>
	`${process.env.SOCIAL_PRICES_API_URL}uploads/${filename}`;

export const getImageAwsUrl = (filename: string): string =>
	`${process.env.BUCKET_SOCIAL_PRICES_AWS_S3}${filename}`;

export const getImageUrl = (filename: string): string => {
	if (!filename?.trim()) {
		return '';
	}

	if (filename.startsWith('http://') || filename.startsWith('https://')) {
		return filename;
	}

	const useLocalFiles: boolean = Boolean(
		process.env?.USE_LOCAL_FILES === 'true',
	);

	if (useLocalFiles) {
		return getImageLocalUrl(filename);
	}

	return getImageAwsUrl(filename);
};

export const apiAssetImageUrl = (): string =>
	`${process.env.SOCIAL_PRICES_API_URL}api/v1/assets/images`;

export const getImageAvatarDefault = (): string =>
	`${apiAssetImageUrl()}/avatar-default.png`;

export const getLogo1 = (): string => `${apiAssetImageUrl()}/logo1.png`;
