import assert from "node:assert/strict";
import test from "node:test";

import {
	buildPublicSlug,
	compilePattern,
	resolvePermalinkForEntry,
} from "../src/utils/permalink/resolver.ts";

test("buildPublicSlug prefers alias over file stem", () => {
	assert.equal(
		buildPublicSlug({
			alias: "legacy-post",
			fileStem: "my-file",
			aliasValidation: "error",
		}),
		"legacy-post",
	);
});

test("compilePattern supports path-aware html templates", () => {
	const render = compilePattern("/%path%/%postname%.html");
	assert.equal(
		render({
			slug: "hello-world",
			path: "notes/2024",
			year: "2024",
			month: "04",
			day: "21",
			id: "7",
			type: "posts",
		}),
		"/notes/2024/hello-world.html",
	);
});

test("resolvePermalinkForEntry supports %path% with trailingSlash auto", () => {
	const permalink = resolvePermalinkForEntry({
		entryType: "post",
		entryId: "guide/intro",
		fileStem: "intro",
		alias: "",
		permalink: "",
		pattern: "/%path%/%slug%",
		postPatternRules: [],
		published: new Date("2024-04-21"),
		aliasValidation: "error",
		trailingSlash: "auto",
	});

	assert.equal(permalink, "/guide/intro/");
});

test("resolvePermalinkForEntry lets directory rules override the global post pattern within the same materialization family", () => {
	const permalink = resolvePermalinkForEntry({
		entryType: "post",
		entryId: "wp/foo",
		fileStem: "foo",
		alias: "",
		permalink: "",
		pattern: "/%path%/%slug%",
		postPatternRules: [
			{ match: "wp/**", pattern: "/%year%/%monthnum%/%day%/%slug%" },
		],
		published: new Date("2024-04-21"),
		aliasValidation: "error",
		trailingSlash: "auto",
	});

	assert.equal(permalink, "/2024/04/21/foo/");
});

test("resolvePermalinkForEntry keeps html permalink plus always as a trailing-slash public path", () => {
	const permalink = resolvePermalinkForEntry({
		entryType: "post",
		entryId: "hello-world",
		fileStem: "hello-world",
		alias: "",
		permalink: "",
		pattern: "/%slug%.html",
		postPatternRules: [],
		published: new Date("2024-04-21"),
		aliasValidation: "error",
		trailingSlash: "always",
	});

	assert.equal(permalink, "/hello-world.html/");
});
