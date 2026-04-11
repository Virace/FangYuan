const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\([^)]+\)|<img\s/i;

const hasText = (value?: string | null): boolean => {
	return Boolean(value?.trim());
};

export const shouldEnablePhotoSwipe = (
	markdownBody?: string,
	coverImage?: string,
): boolean => {
	return hasText(coverImage) || MARKDOWN_IMAGE_PATTERN.test(markdownBody ?? "");
};
