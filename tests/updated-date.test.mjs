import assert from "node:assert/strict";
import test from "node:test";

import {
	applyEffectiveUpdatedDates,
	buildContentRouteManifest,
} from "../src/utils/content-routes.ts";
import { resolveUpdatedDate } from "../src/utils/updated-date.ts";

test("resolveUpdatedDate manual mode only uses explicit frontmatter", async () => {
	const result = await resolveUpdatedDate({
		mode: "manual",
		fallback: "none",
		frontmatterUpdated: new Date("2024-04-22"),
	});

	assert.equal(result?.toISOString(), new Date("2024-04-22").toISOString());
});

test("resolveUpdatedDate git mode falls back to null when git is unavailable and fallback is none", async () => {
	const result = await resolveUpdatedDate({
		mode: "git",
		fallback: "none",
		frontmatterUpdated: undefined,
		filePath: "site/content/posts/demo.md",
		gitProvider: async () => null,
		filesystemProvider: async () => new Date("2024-04-23"),
	});

	assert.equal(result, null);
});

test("manual updated date wins over git and filesystem providers", async () => {
	const result = await resolveUpdatedDate({
		mode: "manual",
		fallback: "filesystem",
		frontmatterUpdated: new Date("2025-01-02"),
		gitProvider: async () => new Date("2025-01-03"),
		filesystemProvider: async () => new Date("2025-01-04"),
	});

	assert.equal(result?.toISOString(), new Date("2025-01-02").toISOString());
});

test("filesystem mode only runs when explicitly selected or used as fallback", async () => {
	const result = await resolveUpdatedDate({
		mode: "git",
		fallback: "filesystem",
		frontmatterUpdated: undefined,
		gitProvider: async () => null,
		filesystemProvider: async () => new Date("2025-01-05"),
	});

	assert.equal(result?.toISOString(), new Date("2025-01-05").toISOString());
});

test("applyEffectiveUpdatedDates keeps entry.id while hydrating updated dates", async () => {
	const manifest = buildContentRouteManifest({
		posts: [
			{
				id: "guide/intro",
				data: {
					title: "Intro",
					published: new Date("2026-04-21"),
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
			updatedDateMode: "git",
			updatedDateFallback: "filesystem",
		},
	});

	const hydrated = await applyEffectiveUpdatedDates(
		manifest,
		{
			updatedDateMode: "git",
			updatedDateFallback: "filesystem",
		},
		{
			gitProvider: async () => null,
			filesystemProvider: async () => new Date("2026-04-22"),
		},
	);

	assert.equal(hydrated.posts[0].entryId, "guide/intro");
	assert.equal(
		hydrated.posts[0].entry.data.updated?.toISOString(),
		new Date("2026-04-22").toISOString(),
	);
});
