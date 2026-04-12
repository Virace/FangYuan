import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..");
const shellCommand =
	process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "sh";
const shellArgs =
	process.platform === "win32"
		? ["/d", "/s", "/c", "pnpm build"]
		: ["-lc", "pnpm build"];

test("build output should not contain Tailwind CSS optimization warnings", async () => {
	const { stdout, stderr } = await execFileAsync(shellCommand, shellArgs, {
		cwd: repoRoot,
		env: process.env,
		maxBuffer: 10 * 1024 * 1024,
	});
	const output = `${stdout}\n${stderr}`;

	assert.doesNotMatch(
		output,
		/Found \d+ warnings while optimizing generated CSS:/,
		"Build should not report CSS optimization warnings after the Tailwind v4 migration cleanup",
	);
	assert.doesNotMatch(
		output,
		/Unexpected token Delim\('&'\)/,
		"Build should not emit invalid escaped CSS variable tokens in generated CSS",
	);
});

test("app shell components should not keep legacy inline color utilities", async () => {
	const filesToCheck = [
		path.join(repoRoot, "src", "layouts", "MainGridLayout.astro"),
		path.join(repoRoot, "src", "components", "ArchivePanel.svelte"),
		path.join(repoRoot, "src", "components", "Footer.astro"),
		path.join(repoRoot, "src", "components", "widget", "DisplaySettings.svelte"),
		path.join(repoRoot, "src", "components", "widget", "Profile.astro"),
	];
	const legacyInlineColorPattern =
		/(?:text|bg|border)-\[(?:var\(--|oklch\()/;

	for (const filePath of filesToCheck) {
		const source = await readFile(filePath, "utf8");

		assert.doesNotMatch(
			source,
			legacyInlineColorPattern,
			`${path.relative(repoRoot, filePath)} should use token-backed Tailwind v4 utilities instead of legacy inline color utilities`,
		);
	}
});

test("layout shell should prefer semantic Tailwind v4 utilities over repeated arbitrary layout bridges", async () => {
	const fileExpectations = [
		{
			filePath: path.join(repoRoot, "src", "layouts", "MainGridLayout.astro"),
			mustInclude: ["page-shell", "layout-main-grid", "toc-rail", "toc-scroll-region"],
			mustExclude: [
				/max-w-\(--page-width\)/,
				/grid-cols-\[17\.5rem_auto\]/,
				/grid-rows-\[auto_1fr_auto\]/,
				/-right-\(--toc-width\)/,
				/w-\(--toc-width\)/,
				/h-\[calc\(100vh-20rem\)\]/,
			],
		},
		{
			filePath: path.join(repoRoot, "src", "components", "Navbar.astro"),
			mustInclude: ["page-shell"],
			mustExclude: [/max-w-\(--page-width\)/],
		},
		{
			filePath: path.join(repoRoot, "src", "pages", "posts", "[...slug].astro"),
			mustInclude: ["post-nav-title"],
			mustExclude: [/max-w-\[calc\(100%-3rem\)\]/],
		},
		{
			filePath: path.join(repoRoot, "src", "components", "PostCard.astro"),
			mustInclude: [
				"post-card-body-no-cover",
				"post-card-body-with-cover",
				"post-card-cover-frame",
			],
			mustExclude: [
				/w-\[calc\(100%-52px-12px\)\]/,
				/w-\[calc\(100%-var\(--coverWidth\)-12px\)\]/,
				/w-\(--coverWidth\)/,
			],
		},
	];

	for (const { filePath, mustInclude, mustExclude } of fileExpectations) {
		const source = await readFile(filePath, "utf8");

		for (const token of mustInclude) {
			assert.match(
				source,
				new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
				`${path.relative(repoRoot, filePath)} should use ${token} after the layout semanticization pass`,
			);
		}

		for (const pattern of mustExclude) {
			assert.doesNotMatch(
				source,
				pattern,
				`${path.relative(repoRoot, filePath)} should not regress to the targeted arbitrary layout bridge ${pattern}`,
			);
		}
	}
});

test("Astro and Svelte local style blocks should not keep stylus preprocessors after the v4 CSS-first migration", async () => {
	const filesToCheck = [
		path.join(repoRoot, "src", "components", "control", "BackToTop.astro"),
		path.join(repoRoot, "src", "components", "widget", "DisplaySettings.svelte"),
	];

	for (const filePath of filesToCheck) {
		const source = await readFile(filePath, "utf8");

		assert.doesNotMatch(
			source,
			/<style\s+lang=["']stylus["']/,
			`${path.relative(repoRoot, filePath)} should use plain CSS style blocks after the Tailwind v4 migration`,
		);
	}
});

test("Layout should prefer built-in font-size utilities over arbitrary root text sizing", async () => {
	const layoutPath = path.join(repoRoot, "src", "layouts", "Layout.astro");
	const source = await readFile(layoutPath, "utf8");

	assert.match(
		source,
		/class="bg-page-bg text-sm transition md:text-base"/,
		"Layout.astro should use built-in text-sm and md:text-base utilities for the root font size",
	);

	assert.doesNotMatch(
		source,
		/text-\[14px\]\s+md:text-\[16px\]/,
		"Layout.astro should not regress to arbitrary root font-size utilities once the Tailwind v4 semantic pass is applied",
	);
});

test("main.css should use shared tokens instead of hard-coded dark mode button foreground overrides", async () => {
	const [mainCssSource, variablesSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "styles", "main.css"), "utf8"),
		readFile(path.join(repoRoot, "src", "styles", "variables.css"), "utf8"),
	]);

	for (const tokenName of [
		"--btn-plain-content",
		"--btn-regular-content",
		"--btn-card-disabled-content",
	]) {
		assert.match(
			variablesSource,
			new RegExp(tokenName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
			`variables.css should define ${tokenName} for token-backed light and dark button colors`,
		);
	}

	for (const requiredPattern of [
		/\.btn-plain\s*\{[\s\S]*?color:\s*var\(--btn-plain-content\);/,
		/\.btn-regular\s*\{[\s\S]*?color:\s*var\(--btn-regular-content\);/,
		/\.btn-card\.disabled\s*\{[\s\S]*?color:\s*var\(--btn-card-disabled-content\);/,
	]) {
		assert.match(
			mainCssSource,
			requiredPattern,
			`main.css should keep ${requiredPattern} token-backed after the v4 semantic sweep`,
		);
	}

	for (const bannedPattern of [
		/\.dark \.btn-plain\s*\{/,
		/\.dark \.btn-plain:hover\s*\{/,
		/\.dark \.btn-regular\s*\{/,
		/\.dark \.btn-card\.disabled\s*\{/,
	]) {
		assert.doesNotMatch(
			mainCssSource,
			bannedPattern,
			`main.css should not regress to hard-coded dark override ${bannedPattern}`,
		);
	}
});

test("tailwind-theme.css should not keep the unused card-shadow utility alias", async () => {
	const themeSource = await readFile(
		path.join(repoRoot, "src", "styles", "tailwind-theme.css"),
		"utf8",
	);

	assert.doesNotMatch(
		themeSource,
		/@utility card-shadow\b/,
		"tailwind-theme.css should not retain the unused card-shadow utility after the v4 utility sweep",
	);
});

test("MainGridLayout banner credit should use built-in font-size utilities instead of arbitrary icon sizes", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "layouts", "MainGridLayout.astro"),
		"utf8",
	);

	for (const requiredPattern of [/text-white\/75 text-xl mr-1/, /text-banner-credit-accent right-4 text-xs opacity-0/]) {
		assert.match(
			source,
			requiredPattern,
			`MainGridLayout.astro should keep ${requiredPattern} after the banner credit semantic sweep`,
		);
	}

	for (const bannedPattern of [/text-\[1\.25rem\]/, /text-\[0\.75rem\]/]) {
		assert.doesNotMatch(
			source,
			bannedPattern,
			`MainGridLayout.astro should not regress to arbitrary banner credit font-size utility ${bannedPattern}`,
		);
	}
});

test("Navbar should use built-in icon font-size utilities where exact arbitrary sizes are unnecessary", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "components", "Navbar.astro"),
		"utf8",
	);

	for (const requiredPattern of [/material-symbols:palette-outline" class="text-xl"/, /material-symbols:menu-rounded" class="text-xl"/, /fa6-solid:arrow-up-right-from-square" class="text-sm/]) {
		assert.match(
			source,
			requiredPattern,
			`Navbar.astro should keep ${requiredPattern} after the icon-size semantic sweep`,
		);
	}

	for (const bannedPattern of [/text-\[1\.25rem\]/, /text-\[0\.875rem\]/]) {
		assert.doesNotMatch(
			source,
			bannedPattern,
			`Navbar.astro should not regress to unnecessary arbitrary icon font-size utility ${bannedPattern}`,
		);
	}
});

test("Footer should use the shared footer divider token instead of hard-coded light and dark border colors", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "components", "Footer.astro"),
		"utf8",
	);

	assert.match(
		source,
		/border-footer-divider/,
		"Footer.astro should use border-footer-divider for the top divider after the v4 token sweep",
	);

	assert.doesNotMatch(
		source,
		/border-black\/10 dark:border-white\/15/,
		"Footer.astro should not regress to the hard-coded light/dark footer divider border colors",
	);
});

test("PostCard should prefer shared semantic tokens over duplicated dark variants and hard-coded divider colors", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "components", "PostCard.astro"),
		"utf8",
	);

	for (const requiredPattern of [/hover:text-primary/, /active:text-title-active/, /text-sm text-30 flex gap-4 transition/, /border-line-divider/]) {
		assert.match(
			source,
			requiredPattern,
			`PostCard.astro should keep ${requiredPattern} after the token sweep`,
		);
	}

	for (const bannedPattern of [
		/hover:text-primary dark:hover:text-primary/,
		/active:text-title-active dark:active:text-title-active/,
		/text-black\/30 dark:text-white\/30/,
		/border-black\/10 dark:border-white\/15/,
	]) {
		assert.doesNotMatch(
			source,
			bannedPattern,
			`PostCard.astro should not regress to duplicated dark-variant or hard-coded token pair ${bannedPattern}`,
		);
	}
});

test("PostMeta should not duplicate dark hover variants for token-backed primary links", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "components", "PostMeta.astro"),
		"utf8",
	);

	assert.match(
		source,
		/hover:text-primary whitespace-nowrap/,
		"PostMeta.astro should keep hover:text-primary on category and tag links after the v4 token sweep",
	);

	assert.doesNotMatch(
		source,
		/hover:text-primary dark:hover:text-primary/,
		"PostMeta.astro should not regress to duplicated dark hover variants for token-backed primary links",
	);
});

test("ArchivePanel should not rely on arbitrary hover text reset on the row button shell", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "components", "ArchivePanel.svelte"),
		"utf8",
	);

	assert.match(
		source,
		/class="group btn-plain block! h-10 w-full rounded-lg"/,
		"ArchivePanel.svelte should keep the row shell on btn-plain without an arbitrary hover text reset",
	);

	assert.doesNotMatch(
		source,
		/hover:text-\[initial\]/,
		"ArchivePanel.svelte should not regress to the arbitrary hover:text-[initial] bridge",
	);
});

test("ArchivePanel should use semantic archive column utilities instead of repeated arbitrary percentage width bridges", async () => {
	const [themeSource, archiveSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "styles", "tailwind-theme.css"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "ArchivePanel.svelte"), "utf8"),
	]);

	for (const requiredPattern of [
		/@utility archive-side-col\b/,
		/@utility archive-main-col\b/,
		/@utility archive-title-col\b/,
		/@utility archive-tags-col\b/,
		/archive-side-col/,
		/archive-main-col/,
		/archive-title-col/,
		/archive-tags-col/,
	]) {
		const source = requiredPattern.source.startsWith("@utility")
			? themeSource
			: archiveSource;
		assert.match(
			source,
			requiredPattern,
			`ArchivePanel semantic width sweep should keep ${requiredPattern}`,
		);
	}

	for (const bannedPattern of [
		/w-\[15%\]\s+md:w-\[10%\]/,
		/w-\[70%\]\s+md:w-\[80%\]/,
		/w-\[70%\]\s+md:max-w-\[65%\]\s+md:w-\[65%\]/,
		/hidden\s+md:block\s+md:w-\[15%\]/,
	]) {
		assert.doesNotMatch(
			archiveSource,
			bannedPattern,
			`ArchivePanel should not regress to repeated arbitrary width bridge ${bannedPattern}`,
		);
	}
});

test("Post detail page should prefer shared text tokens and equivalent built-in title sizing utilities", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "pages", "posts", "[...slug].astro"),
		"utf8",
	);

	for (const requiredPattern of [/flex flex-row text-30 gap-5 mb-3 transition onload-animation/, /bg-soft-contrast text-50/, /text-3xl md:text-4xl\/11/, /text-90/]) {
		assert.match(
			source,
			requiredPattern,
			`posts/[...slug].astro should keep ${requiredPattern} after the article semantic sweep`,
		);
	}

	for (const bannedPattern of [
		/text-black\/30 dark:text-white\/30/,
		/text-black\/50 dark:text-white\/50/,
		/bg-black\/5 dark:bg-white\/10/,
		/md:text-\[2\.25rem\]\/\[2\.75rem\]/,
		/text-black\/90 dark:text-white\/90/,
	]) {
		assert.doesNotMatch(
			source,
			bannedPattern,
			`posts/[...slug].astro should not regress to hard-coded text tone pair or arbitrary title size ${bannedPattern}`,
		);
	}
});

test("ButtonLink should not duplicate dark hover variants for token-backed primary hover color", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "components", "control", "ButtonLink.astro"),
		"utf8",
	);

	assert.match(
		source,
		/hover:text-primary/,
		"ButtonLink.astro should keep hover:text-primary after the control-button token sweep",
	);

	assert.doesNotMatch(
		source,
		/dark:hover:text-primary/,
		"ButtonLink.astro should not regress to duplicated dark hover variants for token-backed primary hover color",
	);
});

test("Profile should use built-in sizing utilities for avatar card width and social icons", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "components", "widget", "Profile.astro"),
		"utf8",
	);

	for (const requiredPattern of [/max-w-48/, /text-2xl/]) {
		assert.match(
			source,
			requiredPattern,
			`Profile.astro should keep ${requiredPattern} after the profile semantic sweep`,
		);
	}

	for (const bannedPattern of [/max-w-\[12rem\]/, /text-\[1\.5rem\]/]) {
		assert.doesNotMatch(
			source,
			bannedPattern,
			`Profile.astro should not regress to unnecessary arbitrary sizing utility ${bannedPattern}`,
		);
	}
});

test("DisplaySettings should use built-in font-size utilities for the reset icon", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "components", "widget", "DisplaySettings.svelte"),
		"utf8",
	);

	assert.match(
		source,
		/fa6-solid:arrow-rotate-left" class="text-sm"/,
		"DisplaySettings.svelte should keep the reset icon on text-sm after the semantic sweep",
	);

	assert.doesNotMatch(
		source,
		/text-\[0\.875rem\]/,
		"DisplaySettings.svelte should not regress to arbitrary 0.875rem icon sizing",
	);
});

test("License should prefer shared text tone utilities over duplicated light and dark text pairs", async () => {
	const source = await readFile(
		path.join(repoRoot, "src", "components", "misc", "License.astro"),
		"utf8",
	);

	for (const requiredPattern of [/font-bold text-75/, /text-30 text-sm/, /text-75 line-clamp-2/]) {
		assert.match(
			source,
			requiredPattern,
			`License.astro should keep ${requiredPattern} after the license token sweep`,
		);
	}

	for (const bannedPattern of [/text-black\/75 dark:text-white\/75/, /text-black\/30 dark:text-white\/30/]) {
		assert.doesNotMatch(
			source,
			bannedPattern,
			`License.astro should not regress to duplicated light/dark text tone pair ${bannedPattern}`,
		);
	}
});

test("tailwind-theme should expose shared low-opacity text utilities for navbar affordances and license watermark", async () => {
	const [themeSource, navbarSource, licenseSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "styles", "tailwind-theme.css"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "Navbar.astro"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "misc", "License.astro"), "utf8"),
	]);

	for (const requiredPattern of [/@utility text-20\b/, /@utility text-5\b/]) {
		assert.match(
			themeSource,
			requiredPattern,
			`tailwind-theme.css should define ${requiredPattern} for shared low-opacity text tones`,
		);
	}

	assert.match(
		navbarSource,
		/text-20/,
		"Navbar.astro should use text-20 for the external-link affordance icon after the shared text-tone sweep",
	);
	assert.doesNotMatch(
		navbarSource,
		/text-black\/20 dark:text-white\/20/,
		"Navbar.astro should not regress to the hard-coded 20% light/dark text pair",
	);

	assert.match(
		licenseSource,
		/text-5/,
		"License.astro should use text-5 for the Creative Commons watermark after the shared text-tone sweep",
	);
	assert.doesNotMatch(
		licenseSource,
		/text-black\/5 dark:text-white\/5/,
		"License.astro should not regress to the hard-coded 5% light/dark text pair",
	);
});

test("tailwind-theme should expose a shared low-opacity surface utility for article meta chips and TOC depth markers", async () => {
	const [themeSource, postSource, tocSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "styles", "tailwind-theme.css"), "utf8"),
		readFile(path.join(repoRoot, "src", "pages", "posts", "[...slug].astro"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "widget", "TOC.astro"), "utf8"),
	]);

	assert.match(
		themeSource,
		/@utility bg-soft-contrast\b/,
		"tailwind-theme.css should define bg-soft-contrast for shared low-opacity neutral backgrounds",
	);

	assert.match(
		postSource,
		/bg-soft-contrast text-50/,
		"posts/[...slug].astro should use bg-soft-contrast for the article meta icon chips after the shared surface sweep",
	);

	assert.match(
		tocSource,
		/bg-soft-contrast/,
		"TOC.astro should use bg-soft-contrast for the depth-3 marker after the shared surface sweep",
	);

	for (const source of [postSource, tocSource]) {
		assert.doesNotMatch(
			source,
			/bg-black\/5 dark:bg-white\/10/,
			"Consumers should not regress to the duplicated low-opacity light/dark surface pair once bg-soft-contrast exists",
		);
	}
});

test("tailwind-theme should expose shared exact-size icon utilities for repeated 28px and 32px icons", async () => {
	const [themeSource, navbarSource, paginationSource, widgetLayoutSource, postCardSource, postDetailSource] =
		await Promise.all([
			readFile(path.join(repoRoot, "src", "styles", "tailwind-theme.css"), "utf8"),
			readFile(path.join(repoRoot, "src", "components", "Navbar.astro"), "utf8"),
			readFile(path.join(repoRoot, "src", "components", "control", "Pagination.astro"), "utf8"),
			readFile(path.join(repoRoot, "src", "components", "widget", "WidgetLayout.astro"), "utf8"),
			readFile(path.join(repoRoot, "src", "components", "PostCard.astro"), "utf8"),
			readFile(path.join(repoRoot, "src", "pages", "posts", "[...slug].astro"), "utf8"),
		]);

	for (const requiredPattern of [/@utility icon-28\b/, /@utility icon-32\b/]) {
		assert.match(
			themeSource,
			requiredPattern,
			`tailwind-theme.css should define ${requiredPattern} for shared exact-size icon utilities`,
		);
	}

	for (const source of [navbarSource, paginationSource, widgetLayoutSource]) {
		assert.match(
			source,
			/icon-28/,
			"Consumers of the 28px icon size should use the shared icon-28 utility",
		);
		assert.doesNotMatch(
			source,
			/text-\[1\.75rem\]/,
			"Consumers of the 28px icon size should not regress to arbitrary 1.75rem icon sizing",
		);
	}

	for (const source of [postCardSource, postDetailSource]) {
		assert.match(
			source,
			/icon-32/,
			"Consumers of the 32px icon size should use the shared icon-32 utility",
		);
		assert.doesNotMatch(
			source,
			/text-\[2rem\]/,
			"Consumers of the 32px icon size should not regress to arbitrary 2rem icon sizing",
		);
	}
});

test("Pagination should use a semantic current-page foreground token instead of a hard-coded light and dark text pair", async () => {
	const [variablesSource, themeSource, paginationSource] = await Promise.all([
		readFile(path.join(repoRoot, "src", "styles", "variables.css"), "utf8"),
		readFile(path.join(repoRoot, "src", "styles", "tailwind-theme.css"), "utf8"),
		readFile(path.join(repoRoot, "src", "components", "control", "Pagination.astro"), "utf8"),
	]);

	assert.match(
		variablesSource,
		/--pagination-current-content/,
		"variables.css should define --pagination-current-content for the current-page pill foreground",
	);
	assert.match(
		themeSource,
		/--color-pagination-current-content: var\(--pagination-current-content\);/,
		"tailwind-theme.css should expose --color-pagination-current-content to Tailwind utilities",
	);
	assert.match(
		paginationSource,
		/text-pagination-current-content/,
		"Pagination.astro should use text-pagination-current-content for the active page pill foreground",
	);
	assert.doesNotMatch(
		paginationSource,
		/text-white dark:text-black\/70/,
		"Pagination.astro should not regress to the hard-coded active pill light/dark text pair",
	);
});

test("tailwind-theme should expose a shared panel title utility for repeated neutral heading pairs", async () => {
	const [themeSource, displaySettingsSource, widgetLayoutSource] =
		await Promise.all([
			readFile(path.join(repoRoot, "src", "styles", "tailwind-theme.css"), "utf8"),
			readFile(path.join(repoRoot, "src", "components", "widget", "DisplaySettings.svelte"), "utf8"),
			readFile(path.join(repoRoot, "src", "components", "widget", "WidgetLayout.astro"), "utf8"),
		]);

	assert.match(
		themeSource,
		/@utility text-panel-title\b/,
		"tailwind-theme.css should define text-panel-title for shared widget/panel heading tones",
	);

	for (const source of [displaySettingsSource, widgetLayoutSource]) {
		assert.match(
			source,
			/text-panel-title/,
			"Panel title consumers should use text-panel-title after the shared heading-tone sweep",
		);
		assert.doesNotMatch(
			source,
			/text-neutral-900 dark:text-neutral-100/,
			"Panel title consumers should not regress to duplicated neutral light/dark text pairs",
		);
	}
});
