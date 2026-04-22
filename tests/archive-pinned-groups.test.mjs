import assert from "node:assert/strict";
import test from "node:test";

import { buildArchivePostGroups } from "../src/utils/archive-post-groups.ts";

function makePost({
	slug,
	title,
	published,
	sticky = 0,
}) {
	return {
		slug,
		data: {
			title,
			published: new Date(published),
			updated: undefined,
			alias: "",
			permalink: "",
			draft: false,
			description: "",
			image: "",
			tags: [],
			category: "Demo",
			lang: "zh_CN",
			sticky,
			prevTitle: "",
			prevSlug: "",
			nextTitle: "",
			nextSlug: "",
			publicPath: `/${slug}/`,
			prevPermalink: "",
			nextPermalink: "",
		},
	};
}

test("buildArchivePostGroups keeps pinned posts in year groups by default", () => {
	const { pinnedPosts, yearGroups } = buildArchivePostGroups(
		[
			makePost({
				slug: "pinned-demo",
				title: "Pinned Demo",
				published: "2024-01-01T00:00:00.000Z",
				sticky: 1,
			}),
			makePost({
				slug: "regular-demo",
				title: "Regular Demo",
				published: "2024-02-01T00:00:00.000Z",
			}),
		],
		{ showPinnedInTimeline: true },
	);

	assert.deepEqual(pinnedPosts.map((post) => post.slug), ["pinned-demo"]);
	assert.deepEqual(yearGroups[0].posts.map((post) => post.slug), [
		"pinned-demo",
		"regular-demo",
	]);
});

test("buildArchivePostGroups can hide pinned posts from year groups", () => {
	const { pinnedPosts, yearGroups } = buildArchivePostGroups(
		[
			makePost({
				slug: "pinned-demo",
				title: "Pinned Demo",
				published: "2024-01-01T00:00:00.000Z",
				sticky: 1,
			}),
			makePost({
				slug: "regular-demo",
				title: "Regular Demo",
				published: "2024-02-01T00:00:00.000Z",
			}),
		],
		{ showPinnedInTimeline: false },
	);

	assert.deepEqual(pinnedPosts.map((post) => post.slug), ["pinned-demo"]);
	assert.deepEqual(yearGroups[0].posts.map((post) => post.slug), ["regular-demo"]);
});
