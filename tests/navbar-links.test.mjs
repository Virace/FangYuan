import assert from "node:assert/strict";
import test from "node:test";

import { LinkPreset } from "../src/types/config.ts";
import { buildContentRouteManifest } from "../src/utils/content-routes.ts";
import { resolveNavbarLinks } from "../src/utils/navbar-links.ts";

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

test("resolveNavbarLinks resolves About preset and custom spec refs against current public paths", () => {
	const manifest = createManifest();
	const presetMap = {
		[LinkPreset.Home]: {
			name: "主页",
			url: "/",
		},
		[LinkPreset.Archive]: {
			name: "归档",
			url: "/archive/",
		},
		[LinkPreset.About]: {
			name: "关于",
			ref: {
				collection: "spec",
				id: "about",
			},
		},
	};

	assert.deepEqual(
		resolveNavbarLinks(
			[
				LinkPreset.Home,
				LinkPreset.About,
				{
					name: "AAA",
					ref: {
						collection: "spec",
						id: "aaa",
					},
				},
				{
					name: "GitHub",
					url: "https://github.com/Virace/FangYuan",
					external: true,
				},
			],
			manifest,
			presetMap,
		),
		[
			{ name: "主页", url: "/", external: false },
			{ name: "关于", url: "/about.html", external: false },
			{ name: "AAA", url: "/bbb.html", external: false },
			{
				name: "GitHub",
				url: "https://github.com/Virace/FangYuan",
				external: true,
			},
		],
	);
});

test("resolveNavbarLinks rejects links that define both url and ref", () => {
	const manifest = createManifest();
	const presetMap = {
		[LinkPreset.Home]: {
			name: "主页",
			url: "/",
		},
		[LinkPreset.Archive]: {
			name: "归档",
			url: "/archive/",
		},
		[LinkPreset.About]: {
			name: "关于",
			ref: {
				collection: "spec",
				id: "about",
			},
		},
	};

	assert.throws(
		() =>
			resolveNavbarLinks(
				[
					{
						name: "Broken",
						url: "/broken",
						ref: {
							collection: "spec",
							id: "about",
						},
					},
				],
				manifest,
				presetMap,
			),
		/exactly one of url or ref/i,
	);
});
