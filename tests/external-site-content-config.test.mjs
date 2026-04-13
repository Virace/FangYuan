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
		/import \{ loadExternalExpressiveCodeConfig \} from "\.\/src\/utils\/site-source\.ts";/,
		"Astro config should use the node-side loader instead of the client-consumed runtime config module",
	);

	assert.doesNotMatch(
		astroConfigSource,
		/import \{ expressiveCodeConfig \} from "\.\/src\/config\.ts";/,
		"Astro config should stop importing expressiveCodeConfig from src/config.ts",
	);
});

test("repo should ignore and document the local external site layer", async () => {
	const [gitignoreSource, readmeSource] = await Promise.all([
		readRepoFile(".gitignore"),
		readRepoFile("README.md"),
	]);

	assert.match(
		gitignoreSource,
		/^site\/$/m,
		".gitignore should ignore the local site/ input layer",
	);

	assert.match(
		readmeSource,
		/site\/config\.ts/,
		"README should document the external config override file",
	);

	assert.match(
		readmeSource,
		/site\/content\//,
		"README should document the external content directory",
	);

	assert.match(
		readmeSource,
		/node scripts\/init-site\.js/,
		"README should document the scaffold command",
	);

	assert.match(
		readmeSource,
		/site\/assets\/.*暂未接入运行时资源解析/s,
		"README should call out that site/assets is scaffolded but not wired into runtime asset resolution in phase 1",
	);
});
