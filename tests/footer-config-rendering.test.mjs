import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

test("footer config types and defaults should expose备案 fields", async () => {
	const [configSource, typesSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "config.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "types", "config.ts"), "utf8"),
	]);

	assert.match(
		typesSource,
		/icp\?: string \| null;/,
		"FooterConfig should expose icp as an optional nullable field",
	);

	assert.match(
		typesSource,
		/policeRecord\?: string \| null;/,
		"FooterConfig should expose policeRecord as an optional nullable field",
	);

	assert.match(
		configSource,
		/footerConfig: FooterConfig[\s\S]*customHtml:\s*""[\s\S]*icp:\s*null[\s\S]*policeRecord:\s*null/,
		"footerConfig should keep customHtml and allow备案 fields to stay empty",
	);
});

test("footer utils should derive备案 links and customHtml rendering hints", async () => {
	const footerUtilsSource = await readFile(
		path.join(repoRoot, "src", "utils", "footer-utils.ts"),
		"utf8",
	);

	assert.match(
		footerUtilsSource,
		/const HTML_TAG_PATTERN = /,
		"footer-utils.ts should detect whether customHtml looks like markup",
	);

	assert.match(
		footerUtilsSource,
		/export function footerCustomHtmlLooksLikeMarkup\(\): boolean \{/,
		"footer-utils.ts should expose a helper for distinguishing plain text from markup",
	);

	assert.match(
		footerUtilsSource,
		/export function getFooterIcpUrl\(\): string \{\s*return "https:\/\/beian\.miit\.gov\.cn\/";\s*\}/,
		"footer-utils.ts should return the fixed ICP filing URL",
	);

	assert.match(
		footerUtilsSource,
		/export function getFooterPoliceRecordCode\(\): string \{/,
		"footer-utils.ts should extract numeric code from the police record text",
	);

	assert.match(
		footerUtilsSource,
		/return `https:\/\/beian\.mps\.gov\.cn\/#\/query\/webSearch\?code=\$\{code\}`;/,
		"footer-utils.ts should build the police filing lookup URL from the extracted numeric code",
	);
});

test("footer component should append configurable text and备案 entries after the existing baseline copy", async () => {
	const footerSource = await readFile(
		path.join(repoRoot, "src", "components", "Footer.astro"),
		"utf8",
	);

	assert.match(
		footerSource,
		/ALL RIGHTS RESERVED\./,
		"Footer.astro should preserve the existing baseline copyright line",
	);

	assert.match(
		footerSource,
		/<Fragment set:html=\{customHtml\}><\/Fragment>/,
		"Footer.astro should render customHtml as raw markup when markup is detected",
	);

	assert.match(
		footerSource,
		/<img src=\{url\("icon\/police-emblem\.png"\)\} alt="" aria-hidden="true"/,
		"Footer.astro should render the police emblem from the public icon directory",
	);

	assert.match(
		footerSource,
		/getFooterIcpUrl\(\)/,
		"Footer.astro should link ICP filing text through the fixed helper URL",
	);

	assert.match(
		footerSource,
		/getFooterPoliceRecordUrl\(\)/,
		"Footer.astro should use the helper-derived police filing URL",
	);

	assert.match(
		footerSource,
		/flex flex-col items-center gap-y-2/,
		"Footer.astro should render备案 entries on separate lines",
	);
});
