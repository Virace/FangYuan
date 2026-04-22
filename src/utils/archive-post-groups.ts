import type { PostForList } from "./content-utils";

export type ArchivePostGroup = {
	year: number;
	posts: PostForList[];
};

export function buildArchivePostGroups(
	posts: PostForList[],
	{
		showPinnedInTimeline,
	}: {
		showPinnedInTimeline: boolean;
	},
): {
	pinnedPosts: PostForList[];
	yearGroups: ArchivePostGroup[];
} {
	const pinnedPosts = posts.filter((post) => (post.data.sticky ?? 0) > 0);
	const timelinePosts = showPinnedInTimeline
		? posts
		: posts.filter((post) => (post.data.sticky ?? 0) <= 0);

	const groupedPosts = timelinePosts.reduce(
		(accumulator, post) => {
			const year = post.data.published.getFullYear();
			if (!accumulator[year]) {
				accumulator[year] = [];
			}
			accumulator[year].push(post);
			return accumulator;
		},
		{} as Record<number, PostForList[]>,
	);

	const yearGroups = Object.keys(groupedPosts)
		.map((yearString) => Number.parseInt(yearString, 10))
		.sort((left, right) => right - left)
		.map((year) => ({
			year,
			posts: groupedPosts[year],
		}));

	return {
		pinnedPosts,
		yearGroups,
	};
}
