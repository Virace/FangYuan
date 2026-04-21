import assert from "node:assert/strict";
import test from "node:test";

import {
	extractExternalPermalinkConfig,
	normalizeAliasOrThrow,
} from "../src/utils/site-source.ts";

test("normalizeAliasOrThrow rejects dots by default", () => {
	assert.throws(
		() => normalizeAliasOrThrow("post.html", "error"),
		/alias.*\./i,
	);
});

test("normalizeAliasOrThrow can normalize dots when explicitly enabled", () => {
	assert.equal(normalizeAliasOrThrow("post.html", "normalize"), "post-html");
});

test("extractExternalPermalinkConfig reads trailingSlash and patterns from site config text", () => {
	const source = `
export const siteConfig = {
	permalink: {
		postsPattern: "/%path%/%slug%",
		pagesPattern: "/%slug%",
		trailingSlash: "auto",
		aliasValidation: "error",
		updatedDateMode: "manual",
		updatedDateFallback: "none",
		postPatternRules: [
			{ match: "wp/**", pattern: "/%year%/%monthnum%/%day%/%slug%" },
		],
	},
};
`;

	assert.deepEqual(extractExternalPermalinkConfig(source), {
		postsPattern: "/%path%/%slug%",
		pagesPattern: "/%slug%",
		trailingSlash: "auto",
		aliasValidation: "error",
		updatedDateMode: "manual",
		updatedDateFallback: "none",
		postPatternRulePatterns: ["/%year%/%monthnum%/%day%/%slug%"],
	});
});
