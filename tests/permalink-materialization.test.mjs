import assert from "node:assert/strict";
import test from "node:test";

import {
	applyTrailingSlash,
	materializePublicPath,
	resolveAstroBuildConfig,
} from "../src/utils/permalink-materialization.ts";

test("applyTrailingSlash keeps html path plus always as a trailing-slash public path", () => {
	assert.equal(applyTrailingSlash("/hello.html", "always"), "/hello.html/");
});

test("materializePublicPath maps html plus always to html directory output", () => {
	assert.deepEqual(materializePublicPath("/hello.html/"), {
		publicPath: "/hello.html/",
		routeParam: "hello.html",
		buildFamily: "directory",
		outputPath: "hello.html/index.html",
	});
});

test("materializePublicPath maps slashless public paths to file output", () => {
	assert.deepEqual(materializePublicPath("/hello"), {
		publicPath: "/hello",
		routeParam: "hello",
		buildFamily: "file",
		outputPath: "hello.html",
	});
});

test("resolveAstroBuildConfig rejects incompatible global materialization families", () => {
	assert.throws(
		() =>
			resolveAstroBuildConfig({
				postsPattern: "/%slug%.html",
				pagesPattern: "/%slug%",
				trailingSlash: "auto",
				postPatternRulePatterns: [],
			}),
		/incompatible.*materialization/i,
	);
});
