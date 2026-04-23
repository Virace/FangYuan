import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadExternalSiteConfigYaml } from "../src/utils/external-site-config.ts";
import { extractExternalPermalinkConfig } from "../src/utils/site-source.ts";

test("extractExternalPermalinkConfig reads trailingSlash and patterns from loaded YAML config", async (t) => {
	const tempRoot = await mkdtemp(path.join(os.tmpdir(), "fangyuan-permalink-"));
	const configPath = path.join(tempRoot, "site.config.yaml");
	t.after(async () => {
		await rm(tempRoot, { recursive: true, force: true });
	});

	await writeFile(
		configPath,
		`
siteConfig:
  permalink:
    postsPattern: /%path%/%slug%
    pagesPattern: /%slug%
    trailingSlash: auto
    aliasValidation: error
    updatedDateMode: manual
    updatedDateFallback: none
    postPatternRules:
      - match: wp/**
        pattern: /%year%/%monthnum%/%day%/%slug%
`,
		"utf8",
	);

	const loaded = loadExternalSiteConfigYaml(configPath);

	assert.deepEqual(extractExternalPermalinkConfig(loaded), {
		postsPattern: "/%path%/%slug%",
		pagesPattern: "/%slug%",
		trailingSlash: "auto",
		aliasValidation: "error",
		updatedDateMode: "manual",
		updatedDateFallback: "none",
		postPatternRulePatterns: ["/%year%/%monthnum%/%day%/%slug%"],
	});
});

test("extractExternalPermalinkConfig returns null when permalink override is missing", () => {
	assert.equal(
		extractExternalPermalinkConfig({
			siteConfig: {
				title: "Virace Notes",
			},
		}),
		null,
	);
});
