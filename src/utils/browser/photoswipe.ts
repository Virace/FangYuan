import type { ImageMetadata } from "astro";

const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*]\([^)]+\)|<img\s/i;

const hasText = (value?: string | null): boolean => {
	return Boolean(value?.trim());
};

export const shouldEnablePhotoSwipe = (
	markdownBody?: string,
	coverImage?: string | ImageMetadata,
): boolean => {
	return (
		(typeof coverImage === "string"
			? hasText(coverImage)
			: Boolean(coverImage)) || MARKDOWN_IMAGE_PATTERN.test(markdownBody ?? "")
	);
};
