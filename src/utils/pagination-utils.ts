import { siteConfig } from "../config";
import { MIN_POSTS_PER_PAGE, PAGE_SIZE } from "../constants/constants";

export function getPostsPerPage(): number {
	const configuredPostsPerPage = siteConfig.postsPerPage;

	if (
		configuredPostsPerPage == null ||
		Number.isNaN(configuredPostsPerPage) ||
		configuredPostsPerPage === 0
	) {
		return PAGE_SIZE;
	}

	const pageSize = Math.max(MIN_POSTS_PER_PAGE, configuredPostsPerPage);

	return pageSize;
}
