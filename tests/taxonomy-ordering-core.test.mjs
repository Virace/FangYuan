import assert from "node:assert/strict";
import test from "node:test";

import {
	sortCategoryItems,
	sortTaxonomyItems,
} from "../src/utils/content/taxonomy-ordering.ts";

test("sortTaxonomyItems sorts by name asc by default-style config", () => {
	const items = sortTaxonomyItems(
		[
			{ name: "Vue 10", count: 2 },
			{ name: "Astro 2", count: 5 },
			{ name: "astro 1", count: 1 },
		],
		{ key: "name", order: "asc" },
	);

	assert.deepEqual(
		items.map((item) => item.name),
		["astro 1", "Astro 2", "Vue 10"],
	);
});

test("sortTaxonomyItems sorts by count desc and falls back to name asc", () => {
	const items = sortTaxonomyItems(
		[
			{ name: "Svelte", count: 2 },
			{ name: "Astro", count: 5 },
			{ name: "Markdown", count: 5 },
			{ name: "CSS", count: 1 },
		],
		{ key: "count", order: "desc" },
	);

	assert.deepEqual(
		items.map((item) => item.name),
		["Astro", "Markdown", "Svelte", "CSS"],
	);
});

test("sortTaxonomyItems does not mutate the input array", () => {
	const input = [
		{ name: "Beta", count: 1 },
		{ name: "Alpha", count: 2 },
	];

	const output = sortTaxonomyItems(input, { key: "name", order: "asc" });

	assert.deepEqual(
		input.map((item) => item.name),
		["Beta", "Alpha"],
	);
	assert.deepEqual(
		output.map((item) => item.name),
		["Alpha", "Beta"],
	);
});

test("sortCategoryItems keeps uncategorized sorted by default", () => {
	const items = sortCategoryItems(
		[
			{ name: "未分类", count: 10 },
			{ name: "指南", count: 2 },
			{ name: "示例", count: 5 },
		],
		{ key: "count", order: "desc", uncategorizedPosition: "sorted" },
		"未分类",
	);

	assert.deepEqual(
		items.map((item) => item.name),
		["未分类", "示例", "指南"],
	);
});

test("sortCategoryItems can pin uncategorized to the end", () => {
	const items = sortCategoryItems(
		[
			{ name: "未分类", count: 10 },
			{ name: "指南", count: 2 },
			{ name: "示例", count: 5 },
		],
		{ key: "count", order: "desc", uncategorizedPosition: "last" },
		"未分类",
	);

	assert.deepEqual(
		items.map((item) => item.name),
		["示例", "指南", "未分类"],
	);
});
