import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");

test("site config should expose postsPerPage with a default value of 6", async () => {
	const [configSource, typesSource, paginationUtilsSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "config.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "types", "config.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "pagination-utils.ts"), "utf8"),
	]);

	assert.match(
		typesSource,
		/postsPerPage\?: number \| null;/,
		"SiteConfig should expose postsPerPage as an optional nullable field",
	);

	assert.match(
		configSource,
		/postsPerPage:\s*null,/,
		"siteConfig should allow postsPerPage to be empty so the shared default can take over",
	);

	assert.match(
		paginationUtilsSource,
		/import \{ MIN_POSTS_PER_PAGE, PAGE_SIZE \} from "\.\.\/constants\/constants";/,
		"pagination-utils.ts should reuse the shared PAGE_SIZE and MIN_POSTS_PER_PAGE constants",
	);
});

test("home pagination should clamp postsPerPage to a minimum of 5 without imposing a maximum", async () => {
	const [pageSource, constantsSource, paginationUtilsSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "pages", "[...page].astro"), "utf8"),
		readFile(path.join(repoRoot, "src", "constants", "constants.ts"), "utf8"),
		readFile(path.join(repoRoot, "src", "utils", "pagination-utils.ts"), "utf8"),
	]);

	assert.match(
		constantsSource,
		/export const PAGE_SIZE = 8;/,
		"constants.ts should restore PAGE_SIZE as the shared default of 8",
	);

	assert.match(
		constantsSource,
		/export const MIN_POSTS_PER_PAGE = 5;/,
		"constants.ts should keep MIN_POSTS_PER_PAGE as the lower bound",
	);

	assert.match(
		paginationUtilsSource,
		/if \(\s*configuredPostsPerPage == null[\s\S]*return PAGE_SIZE;/,
		"pagination-utils.ts should fall back to PAGE_SIZE when postsPerPage is empty",
	);

	assert.match(
		paginationUtilsSource,
		/const configuredPostsPerPage = siteConfig\.postsPerPage;/,
		"pagination-utils.ts should read the page size from siteConfig.postsPerPage",
	);

	assert.match(
		paginationUtilsSource,
		/import \{ MIN_POSTS_PER_PAGE, PAGE_SIZE \} from "\.\.\/constants\/constants";/,
		"pagination-utils.ts should consume both PAGE_SIZE and MIN_POSTS_PER_PAGE from constants.ts",
	);

	assert.match(
		paginationUtilsSource,
		/const pageSize = Math\.max\(MIN_POSTS_PER_PAGE, configuredPostsPerPage\);/,
		"pagination-utils.ts should clamp the page size to the shared minimum constant",
	);

	assert.match(
		paginationUtilsSource,
		/export function getPostsPerPage\(\): number \{/,
		"pagination-utils.ts should expose a dedicated getPostsPerPage helper",
	);

	assert.match(
		pageSource,
		/import \{ getPostsPerPage \} from "\.\.\/utils\/pagination-utils";/,
		"[...page].astro should consume the shared pagination helper",
	);

	assert.match(
		pageSource,
		/const pageSize = getPostsPerPage\(\);/,
		"[...page].astro should delegate final page size calculation to getPostsPerPage",
	);

	assert.doesNotMatch(
		paginationUtilsSource,
		/Math\.min|maxPostsPerPage|MAX_POSTS_PER_PAGE/,
		"pagination-utils.ts should not add an upper bound for postsPerPage",
	);
});
