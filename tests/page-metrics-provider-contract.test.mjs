import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

test("page metrics provider should stay independent from comment provider contracts", async () => {
	const [providerSource, clientSource, defaultConfigSource, appConfigSource] =
		await Promise.all([
			readFile(path.join(repoRoot, "src", "utils", "page-metrics", "provider.ts"), "utf8"),
			readFile(path.join(repoRoot, "src", "utils", "page-metrics", "client.ts"), "utf8"),
			readFile(path.join(repoRoot, "src", "default-config.ts"), "utf8"),
			readFile(path.join(repoRoot, "src", "config.ts"), "utf8"),
		]);

	assert.match(providerSource, /export type PageMetrics = \{/);
	assert.match(providerSource, /pv:\s*number;/);
	assert.match(providerSource, /abstract recordPageView\(/);
	assert.match(clientSource, /export function getPageMetricsClient\(\)/);
	assert.match(clientSource, /recordPageView\(input:/);
	assert.match(defaultConfigSource, /export const defaultPageMetricsConfig: PageMetricsConfig = \{/);
	assert.match(appConfigSource, /export const pageMetricsConfig: PageMetricsConfig =/);
});

test("Artalk page metrics provider should post pv updates through the shared page metrics abstraction", async () => {
	const [providerSource, artalkPagesSource] = await Promise.all([
		readFile(
		path.join(repoRoot, "src", "utils", "page-metrics", "artalk-provider.ts"),
		"utf8",
	),
		readFile(path.join(repoRoot, "src", "utils", "artalk", "pages.ts"), "utf8"),
	]);

	assert.match(artalkPagesSource, /export function createArtalkPagesApi\(config: ArtalkApiConfig\)/);
	assert.match(artalkPagesSource, /\/api\/v2\/pages\/pv\//);
	assert.match(artalkPagesSource, /page_key/);
	assert.match(artalkPagesSource, /page_title/);
	assert.match(artalkPagesSource, /site_name/);
	assert.match(artalkPagesSource, /export function createArtalkPageMetricsService\(/);

	assert.match(providerSource, /export class ArtalkPageMetricsProvider extends PageMetricsProvider \{/);
	assert.match(providerSource, /from "\.\.\/artalk\/pages"/);
	assert.match(providerSource, /createArtalkPageMetricsService\(/);
	assert.match(providerSource, /return this\.artalkPageMetricsService\.recordPageView\(input\)/);
	assert.doesNotMatch(providerSource, /ArtalkPageMetricsResponse/);
	assert.doesNotMatch(providerSource, /return \{\s*pv: metrics\.pv,\s*\}/);
});
