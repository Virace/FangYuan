import type { PostForList } from "./content-utils";
import { isPinnedPost } from "./post-ordering.ts";

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
	const pinnedPosts = posts.filter((post) => isPinnedPost(post.data));
	const timelinePosts = showPinnedInTimeline
		? posts
		: posts.filter((post) => !isPinnedPost(post.data));

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
