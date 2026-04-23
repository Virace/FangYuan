import assert from "node:assert/strict";
import test from "node:test";

import I18nKey from "../src/i18n/i18nKey.ts";
import { LinkPresets } from "../src/constants/link-presets.ts";
import { buildContentRouteManifest } from "../src/utils/content-routes.ts";
import {
	getNavBarLinkId,
	mergeNavBarLinks,
	resolveNavbarLinks,
} from "../src/utils/navbar-links.ts";

function createManifest() {
	return buildContentRouteManifest({
		posts: [],
		specPages: [
			{
				id: "about",
				data: {
					alias: "",
					permalink: "",
					published: new Date("2026-04-21"),
					updated: undefined,
				},
				filePath: "site/content/spec/about.md",
			},
			{
				id: "aaa",
				data: {
					alias: "bbb",
					permalink: "",
					published: new Date("2026-04-21"),
					updated: undefined,
				},
				filePath: "site/content/spec/aaa.md",
			},
		],
		permalinkConfig: {
			postsPattern: "/%path%/%slug%.html",
			pagesPattern: "/%slug%.html",
			trailingSlash: "auto",
			postPatternRules: [],
			aliasValidation: "error",
			updatedDateMode: "manual",
			updatedDateFallback: "none",
		},
	});
}

function translateLabel(key) {
	return (
		{
			[I18nKey.archive]: "归档",
			[I18nKey.about]: "关于",
			"nav.repo": "代码仓库",
			"nav.spec.aaa": "AAA",
		}[key] ?? key
	);
}

test("mergeNavBarLinks injects reserved About when override omits it", () => {
	const mergedLinks = mergeNavBarLinks(
		[
			LinkPresets.Archive,
			LinkPresets.About,
		],
		[LinkPresets.Archive],
		[LinkPresets.About],
	);

	assert.deepEqual(mergedLinks.map((link) => getNavBarLinkId(link)), [
		"archive",
		"about",
	]);
});

test("resolveNavbarLinks supports same-name override, id override, and custom nav i18n", () => {
	const manifest = createManifest();
	const mergedLinks = mergeNavBarLinks(
		[
			LinkPresets.Archive,
			LinkPresets.About,
			{
				id: "nav.github",
				name: "nav.github",
				url: "https://github.com/Virace/FangYuan",
				external: true,
			},
		],
		[
			LinkPresets.Archive,
			{
				name: I18nKey.about,
				ref: {
					collection: "spec",
					id: "aaa",
				},
			},
			{
				name: "nav.spec.aaa",
				ref: {
					collection: "spec",
					id: "aaa",
				},
			},
			{
				id: "nav.github",
				name: "nav.repo",
				url: "https://example.com/repo",
				external: true,
			},
		],
		[LinkPresets.About],
	);

	assert.deepEqual(
		resolveNavbarLinks(mergedLinks, manifest, {
			translateLabel,
		}),
		[
			{ id: "archive", name: "归档", url: "/archive/", external: false },
			{ id: "about", name: "关于", url: "/bbb.html", external: false },
			{ id: "nav.spec.aaa", name: "AAA", url: "/bbb.html", external: false },
			{
				id: "nav.github",
				name: "代码仓库",
				url: "https://example.com/repo",
				external: true,
			},
		],
	);
});

test("resolveNavbarLinks rejects links that define both url and ref", () => {
	const manifest = createManifest();

	assert.throws(
		() =>
			resolveNavbarLinks(
				[
					{
						name: "nav.broken",
						url: "/broken",
						ref: {
							collection: "spec",
							id: "about",
						},
					},
				],
				manifest,
			),
		/exactly one of url or ref/i,
	);
});
