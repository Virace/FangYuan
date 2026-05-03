import assert from "node:assert/strict";
import test from "node:test";

import {
	attachAdjacentPostLinks,
	sortPostRoutes,
} from "../src/utils/post-ordering.ts";

function makeRoute({
	entryId,
	title,
	published,
	updated,
	alias = "",
	sticky,
	filePath,
	publicPath,
}) {
	const data = {
		title,
		published: new Date(published),
		updated: updated ? new Date(updated) : undefined,
		alias,
		prevTitle: "",
		prevSlug: "",
		nextTitle: "",
		nextSlug: "",
	};

	if (sticky !== undefined) {
		data.sticky = sticky;
	}

	return {
		entryId,
		publicPath,
		entry: {
			id: entryId,
			filePath,
			data,
		},
	};
}

test("sortPostRoutes puts higher sticky first and then applies updated desc", () => {
	const routes = sortPostRoutes(
		[
			makeRoute({
				entryId: "regular-old",
				title: "Regular Old",
				published: "2024-01-01T00:00:00.000Z",
				updated: "2024-01-02T00:00:00.000Z",
				publicPath: "/regular-old/",
				filePath: "site/content/posts/regular-old.md",
			}),
			makeRoute({
				entryId: "sticky-one-new",
				title: "Sticky One New",
				published: "2024-01-01T00:00:00.000Z",
				updated: "2024-02-03T00:00:00.000Z",
				sticky: 1,
				publicPath: "/sticky-one-new/",
				filePath: "site/content/posts/sticky-one-new.md",
			}),
			makeRoute({
				entryId: "sticky-one-old",
				title: "Sticky One Old",
				published: "2024-01-01T00:00:00.000Z",
				updated: "2024-02-01T00:00:00.000Z",
				sticky: 1,
				publicPath: "/sticky-one-old/",
				filePath: "site/content/posts/sticky-one-old.md",
			}),
		],
		{ key: "updated", order: "desc" },
	);

	assert.deepEqual(routes.map((route) => route.entryId), [
		"sticky-one-new",
		"sticky-one-old",
		"regular-old",
	]);
});

test("sortPostRoutes treats explicit sticky zero as pinned before omitted sticky", () => {
	const routes = sortPostRoutes(
		[
			makeRoute({
				entryId: "regular-newer",
				title: "Regular Newer",
				published: "2024-01-01T00:00:00.000Z",
				updated: "2024-03-01T00:00:00.000Z",
				publicPath: "/regular-newer/",
				filePath: "site/content/posts/regular-newer.md",
			}),
			makeRoute({
				entryId: "sticky-zero",
				title: "Sticky Zero",
				published: "2024-01-01T00:00:00.000Z",
				updated: "2024-02-01T00:00:00.000Z",
				sticky: 0,
				publicPath: "/sticky-zero/",
				filePath: "site/content/posts/sticky-zero.md",
			}),
		],
		{ key: "updated", order: "desc" },
	);

	assert.deepEqual(routes.map((route) => route.entryId), [
		"sticky-zero",
		"regular-newer",
	]);
});

test("sortPostRoutes falls back from updated to published when updated is missing", () => {
	const routes = sortPostRoutes(
		[
			makeRoute({
				entryId: "published-newer",
				title: "Published Newer",
				published: "2024-02-10T00:00:00.000Z",
				publicPath: "/published-newer/",
				filePath: "site/content/posts/published-newer.md",
			}),
			makeRoute({
				entryId: "published-older",
				title: "Published Older",
				published: "2024-01-10T00:00:00.000Z",
				publicPath: "/published-older/",
				filePath: "site/content/posts/published-older.md",
			}),
		],
		{ key: "updated", order: "desc" },
	);

	assert.deepEqual(routes.map((route) => route.entryId), [
		"published-newer",
		"published-older",
	]);
});

test("sortPostRoutes uses real markdown filename for filename asc", () => {
	const routes = sortPostRoutes(
		[
			makeRoute({
				entryId: "guide",
				title: "Guide",
				published: "2024-01-01T00:00:00.000Z",
				publicPath: "/guide/",
				filePath: "site/content/posts/guide/index.md",
			}),
			makeRoute({
				entryId: "alpha",
				title: "Alpha",
				published: "2024-01-01T00:00:00.000Z",
				publicPath: "/alpha/",
				filePath: "site/content/posts/zeta.md",
			}),
		],
		{ key: "filename", order: "asc" },
	);

	assert.deepEqual(routes.map((route) => route.entryId), ["guide", "alpha"]);
});

test("attachAdjacentPostLinks writes prev and next fields from the sorted order", () => {
	const ordered = attachAdjacentPostLinks([
		makeRoute({
			entryId: "first",
			title: "First",
			published: "2024-03-01T00:00:00.000Z",
			publicPath: "/first/",
			filePath: "site/content/posts/first.md",
		}),
		makeRoute({
			entryId: "second",
			title: "Second",
			published: "2024-02-01T00:00:00.000Z",
			publicPath: "/second/",
			filePath: "site/content/posts/second.md",
		}),
	]);

	assert.equal(ordered[0].entry.data.prevSlug, "second");
	assert.equal(ordered[0].entry.data.prevPermalink, "/second/");
	assert.equal(ordered[1].entry.data.nextSlug, "first");
	assert.equal(ordered[1].entry.data.nextPermalink, "/first/");
});
