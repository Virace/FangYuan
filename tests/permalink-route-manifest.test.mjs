import assert from "node:assert/strict";
import test from "node:test";

import {
	buildContentRouteManifest,
	findContentRouteBySegments,
} from "../src/utils/content-routes.ts";

test("buildContentRouteManifest keeps entry.id as postKey source while exposing public path and build materialization", () => {
	const manifest = buildContentRouteManifest({
		posts: [
			{
				id: "guide/intro",
				data: {
					title: "Intro",
					published: new Date("2024-04-21"),
					updated: undefined,
					alias: "",
					permalink: "",
					draft: false,
					description: "",
					image: "",
					tags: [],
					category: "",
					lang: "",
					prevTitle: "",
					prevSlug: "",
					nextTitle: "",
					nextSlug: "",
				},
				filePath: "site/content/posts/guide/intro.md",
			},
		],
		specPages: [],
		permalinkConfig: {
			postsPattern: "/%path%/%slug%",
			pagesPattern: "/%slug%",
			trailingSlash: "auto",
			postPatternRules: [],
			aliasValidation: "error",
			updatedDateMode: "manual",
			updatedDateFallback: "none",
		},
	});

	assert.equal(manifest.posts[0].entryId, "guide/intro");
	assert.equal(manifest.posts[0].publicPath, "/guide/intro/");
	assert.equal(manifest.posts[0].routeParam, "guide/intro");
	assert.equal(manifest.posts[0].outputPath, "guide/intro/index.html");
});

test("findContentRouteBySegments resolves a post route without changing the internal entry id", () => {
	const route = findContentRouteBySegments(
		[
			{
				kind: "post",
				entryId: "x/y/z",
				publicPath: "/articles/demo.html",
				routeParam: "articles/demo",
				outputPath: "articles/demo.html",
			},
		],
		["articles", "demo"],
	);

	assert.equal(route?.entryId, "x/y/z");
});
