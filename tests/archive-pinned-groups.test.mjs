import assert from "node:assert/strict";
import test from "node:test";

import { buildArchivePostGroups } from "../src/utils/content/archive-groups.ts";

function makePost({
	slug,
	title,
	published,
	sticky,
}) {
	const data = {
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
		prevTitle: "",
		prevSlug: "",
		nextTitle: "",
		nextSlug: "",
		publicPath: `/${slug}/`,
		prevPermalink: "",
		nextPermalink: "",
	};

	if (sticky !== undefined) {
		data.sticky = sticky;
	}

	return {
		slug,
		data,
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

test("buildArchivePostGroups treats explicit sticky zero as pinned", () => {
	const { pinnedPosts, yearGroups } = buildArchivePostGroups(
		[
			makePost({
				slug: "sticky-zero-demo",
				title: "Sticky Zero Demo",
				published: "2024-01-01T00:00:00.000Z",
				sticky: 0,
			}),
			makePost({
				slug: "regular-demo",
				title: "Regular Demo",
				published: "2024-02-01T00:00:00.000Z",
			}),
		],
		{ showPinnedInTimeline: false },
	);

	assert.deepEqual(pinnedPosts.map((post) => post.slug), [
		"sticky-zero-demo",
	]);
	assert.deepEqual(yearGroups[0].posts.map((post) => post.slug), ["regular-demo"]);
});
