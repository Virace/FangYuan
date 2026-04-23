import assert from "node:assert/strict";
import test from "node:test";

import { extractExternalAstroSiteConfig } from "../src/utils/site-source.ts";
import {
	normalizeConfiguredBase,
	normalizeConfiguredSite,
} from "../src/utils/site-runtime-config.ts";

test("normalizeConfiguredSite keeps origin-only site URLs", () => {
	assert.equal(normalizeConfiguredSite("https://example.com/"), "https://example.com");
	assert.equal(normalizeConfiguredSite(" https://example.com "), "https://example.com");
	assert.equal(normalizeConfiguredSite(null), null);
});

test("normalizeConfiguredSite rejects site URLs that still contain a path", () => {
	assert.throws(
		() => normalizeConfiguredSite("https://example.com/blog/"),
		/siteConfig\.site/i,
	);
});

test("normalizeConfiguredBase normalizes common base path inputs", () => {
	assert.equal(normalizeConfiguredBase(undefined), "/");
	assert.equal(normalizeConfiguredBase("/"), "/");
	assert.equal(normalizeConfiguredBase("blog"), "/blog/");
	assert.equal(normalizeConfiguredBase("/blog"), "/blog/");
	assert.equal(normalizeConfiguredBase("/blog/"), "/blog/");
	assert.equal(normalizeConfiguredBase("nested/blog"), "/nested/blog/");
});

test("extractExternalAstroSiteConfig reads site and base from external site config", () => {
	const extracted = extractExternalAstroSiteConfig({
		siteConfig: {
			site: "https://example.com",
			base: "blog",
		},
	});

	assert.deepEqual(extracted, {
		site: "https://example.com",
		base: "/blog/",
	});
});
