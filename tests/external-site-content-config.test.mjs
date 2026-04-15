import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

function readRepoFile(...segments) {
	return readFile(path.join(repoRoot, ...segments), "utf8");
}

test("external site content collections should flow through the shared node-side helper", async () => {
	const [contentConfigSource, siteSource] = await Promise.all([
		readRepoFile("src", "content.config.ts"),
		readRepoFile("src", "utils", "site-source.ts"),
	]);

	assert.match(
		siteSource,
		/export function hasExternalSiteContent\(\): boolean \{/,
		"site-source helper should expose external content detection",
	);

	assert.match(
		siteSource,
		/export function resolveContentRoot\(\): ContentRoot \{/,
		"site-source helper should expose the shared content root resolution",
	);

	assert.match(
		siteSource,
		/const repoRoot = process\.cwd\(\);/,
		"site-source helper should anchor external site resolution to process.cwd so the same root is used in bundled Astro server code",
	);

	assert.doesNotMatch(
		siteSource,
		/fileURLToPath\(import\.meta\.url\)/,
		"site-source helper should not derive the repo root from import.meta.url once it is shared with bundled Astro components",
	);

	assert.match(
		contentConfigSource,
		/import \{ resolveContentRoot \} from "\.\/utils\/site-source";/,
		"content config should import the shared content root helper",
	);

	assert.match(
		contentConfigSource,
		/const contentRoot = resolveContentRoot\(\);/,
		"content config should resolve the content root once before wiring collections",
	);

	assert.match(
		contentConfigSource,
		/base: `\$\{contentRoot\}\/posts`,/,
		"posts collection should append its Astro collection directory onto the shared content root",
	);

	assert.match(
		contentConfigSource,
		/base: `\$\{contentRoot\}\/spec`,/,
		"spec collection should append its Astro collection directory onto the shared content root",
	);

	assert.doesNotMatch(
		contentConfigSource,
		/createOptionalGlobLoader/,
		"content config should not add per-collection empty-directory handling on top of Astro's content layer",
	);

	assert.doesNotMatch(
		siteSource,
		/resolveCollectionBasePath|collectionName: "posts" \| "spec"/,
		"site-source helper should not expose per-collection switching semantics",
	);
});

test("runtime config should merge external overrides without leaking node-only loaders into client-consumed code", async () => {
	const [configSource, defaultConfigSource, astroConfigSource] = await Promise.all([
		readRepoFile("src", "config.ts"),
		readRepoFile("src", "default-config.ts"),
		readRepoFile("astro.config.mjs"),
	]);

	assert.match(
		defaultConfigSource,
		/export const defaultSiteConfig: SiteConfig = \{/,
		"default-config.ts should hold the default site config",
	);

	assert.match(
		defaultConfigSource,
		/export const defaultExpressiveCodeConfig: ExpressiveCodeConfig = \{/,
		"default-config.ts should expose the shared Expressive Code defaults",
	);

	assert.match(
		configSource,
		/import \{[\s\S]*\} from "\.\/default-config";/s,
		"runtime config should import its defaults from the shared default-config module",
	);

	assert.match(
		configSource,
		/defaultSiteConfig/,
		"runtime config should consume the shared default site config",
	);

	assert.match(
		configSource,
		/defaultExpressiveCodeConfig/,
		"runtime config should consume the shared default Expressive Code config",
	);

	assert.match(
		configSource,
		/const externalSiteConfigModules = import\.meta\.glob<ExternalSiteConfigModule>\([\s\S]*"\.\.\/site\/config\.ts"[\s\S]*\{ eager: true \}[\s\S]*\);/,
		"runtime config should load the optional external site config through Vite's eager glob import",
	);

	assert.match(
		configSource,
		/export const siteConfig: SiteConfig = mergeSiteConfig\(/,
		"runtime config should keep siteConfig as a merged export",
	);

	assert.match(
		configSource,
		/export const navBarConfig: NavBarConfig = mergeNavBarConfig\(/,
		"runtime config should keep navBarConfig as a merged export",
	);

	assert.match(
		configSource,
		/export const profileConfig: ProfileConfig = mergeProfileConfig\(/,
		"runtime config should keep profileConfig as a merged export",
	);

	assert.match(
		configSource,
		/links: override\.links \?\? defaultConfig\.links,/,
		"runtime config merge helpers should replace array fields instead of concatenating them",
	);

	assert.doesNotMatch(
		configSource,
		/node:fs|node:path|node:url/,
		"runtime config must stay free of node-only filesystem loaders because it is consumed by client-side code",
	);

	assert.match(
		astroConfigSource,
		/import \{ defaultExpressiveCodeConfig \} from "\.\/src\/default-config\.ts";/,
		"Astro config should import the shared Expressive Code default from default-config.ts",
	);

	assert.match(
		astroConfigSource,
		/import \{[\s\S]*loadExternalExpressiveCodeConfig[\s\S]*\} from "\.\/src\/utils\/site-source\.ts";/,
		"Astro config should use the node-side loader instead of the client-consumed runtime config module",
	);

	assert.match(
		astroConfigSource,
		/import \{[\s\S]*loadExternalArtalkDevProxyTarget[\s\S]*loadExternalExpressiveCodeConfig[\s\S]*\} from "\.\/src\/utils\/site-source\.ts";/,
		"Astro config should also load the optional Artalk dev proxy target through the shared site-source helper",
	);

	assert.match(
		astroConfigSource,
		/const artalkDevProxyTarget = loadExternalArtalkDevProxyTarget\(\);/,
		"Astro config should resolve the optional Artalk dev proxy target before building the Vite config",
	);

	assert.match(
		astroConfigSource,
		/artalkDevProxyTarget\s*\?\s*\{\s*"\/artalk-api": \{/,
		"Astro config should wire a same-origin /artalk-api dev proxy when a local Artalk target is configured",
	);

	assert.match(
		astroConfigSource,
		/rewrite:\s*\(requestPath\)\s*=>\s*requestPath\.replace\(\s*\/\^\\\/artalk-api\/,\s*""\s*\)/,
		"Artalk dev proxy should strip the local /artalk-api prefix before forwarding to Artalk",
	);

	assert.doesNotMatch(
		astroConfigSource,
		/import \{ expressiveCodeConfig \} from "\.\/src\/config\.ts";/,
		"Astro config should stop importing expressiveCodeConfig from src/config.ts",
	);
});

test("site-source should expose an optional literal Artalk dev proxy target loader for local same-origin testing", async () => {
	const siteSource = await readRepoFile("src", "utils", "site-source.ts");

	assert.match(
		siteSource,
		/export function loadExternalArtalkDevProxyTarget\(\): string \| null \{/,
		"site-source should expose a loader for the optional Artalk dev proxy target",
	);

	assert.match(
		siteSource,
		/const targetMatch = source\.match\(/,
		"site-source should parse site/config.ts for the optional Artalk dev proxy target",
	);

	assert.match(
		siteSource,
		/export const artalkDevProxyTarget = \["'`]\(\[\^"'`]\+\)\["'`];\?/,
		"site-source should search for a literal artalkDevProxyTarget export in site/config.ts",
	);
});

test("local site config should allow wiring page metrics through the same Artalk dev proxy surface", async () => {
	const siteConfigSource = await readRepoFile("site", "config.ts");

	assert.match(
		siteConfigSource,
		/import type \{ CommentConfig, PageMetricsConfig \} from "\.\.\/src\/types\/config";/,
		"site/config.ts should type both comment and page metrics config exports",
	);

	assert.match(
		siteConfigSource,
		/import \{ ArtalkPageMetricsProvider \} from "\.\.\/src\/utils\/page-metrics\/artalk-provider";/,
		"site/config.ts should import the dedicated Artalk page metrics adapter",
	);

	assert.match(
		siteConfigSource,
		/export const pageMetricsConfig: PageMetricsConfig = \{/,
		"site/config.ts should expose a pageMetricsConfig override",
	);

	assert.match(
		siteConfigSource,
		/(const artalkBase = "\/artalk-api";|apiBase:\s*"\/artalk-api"|apiBase:\s*artalkBase)/,
		"site/config.ts should point local Artalk verification through the same-origin /artalk-api proxy, either inline or via a shared constant",
	);
});

test("image handling should stay on direct roots with a shared resolver instead of component path guessing", async () => {
	const [configSource, imageSource, imageWrapperSource] = await Promise.all([
		readRepoFile("src", "config.ts"),
		readRepoFile("src", "utils", "image-source.ts"),
		readRepoFile("src", "components", "misc", "ImageWrapper.astro"),
	]);

	assert.match(
		configSource,
		/export const configImageBaseRoots = \{/,
		"runtime config should expose image root provenance for config-driven local assets",
	);

	assert.match(
		imageSource,
		/export async function resolveContentImage\(/,
		"shared image resolver should expose content-image resolution",
	);

	assert.match(
		imageSource,
		/export async function resolveConfigImage\(/,
		"shared image resolver should expose config-image resolution",
	);

	assert.match(
		imageSource,
		/if \(isRelativePath\(value\)\)/,
		"resolver should preserve true relative-path semantics for cover images",
	);

	assert.match(
		imageSource,
		/return resolveRootAlias\(value, inferEntryBaseRoot\(entryFilePath\)\);/,
		"non-relative local cover image aliases should resolve through the root-alias branch",
	);

	assert.doesNotMatch(
		imageWrapperSource,
		/hasExternalSiteContent|import\.meta\.glob|basePath\?: string|buildLookupCandidates|resolveExternalSiteAssetCandidate/,
		"ImageWrapper should stop guessing file paths and only render resolved inputs",
	);
});
