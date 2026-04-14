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

test("Astro resource strategy should use official Font API and retain an opt-in image codec preset", async () => {
	const [
		astroConfigSource,
		layoutSource,
		markdownComponentSource,
		tailwindThemeSource,
		markdownStyleSource,
		expressiveCodeStyleSource,
		languageBadgeSource,
	] = await Promise.all([
		readRepoFile("astro.config.mjs"),
		readRepoFile("src", "layouts", "Layout.astro"),
		readRepoFile("src", "components", "misc", "Markdown.astro"),
		readRepoFile("src", "styles", "tailwind-theme.css"),
		readRepoFile("src", "styles", "markdown.css"),
		readRepoFile("src", "styles", "expressive-code.css"),
		readRepoFile("src", "plugins", "expressive-code", "language-badge.ts"),
	]);

	assert.match(
		astroConfigSource,
		/import\s+\{\s*defineConfig,\s*fontProviders\s*\}\s+from\s+"astro\/config"/,
		"astro.config.mjs should import fontProviders from astro/config",
	);

	assert.match(
		astroConfigSource,
		/fonts:\s*\[/,
		"astro.config.mjs should declare Astro Fonts API configuration",
	);

	assert.match(
		astroConfigSource,
		/cssVariable:\s*"--font-roboto"/,
		"Roboto should be exposed through a CSS variable",
	);

	assert.match(
		astroConfigSource,
		/cssVariable:\s*"--font-jetbrains-mono"/,
		"JetBrains Mono should be exposed through a CSS variable",
	);

	assert.match(
		astroConfigSource,
		/const enableGlobalImageCodecDefaults = false;/,
		"astro.config.mjs should keep global image codec defaults disabled by default",
	);

	assert.match(
		astroConfigSource,
		/const globalImageServiceConfig = \{/,
		"astro.config.mjs should keep the optional image codec preset nearby for future opt-in use",
	);

	assert.match(
		astroConfigSource,
		/jpeg:\s*\{\s*mozjpeg:\s*true\s*\}/,
		"JPEG defaults should remain preserved in the opt-in preset",
	);

	assert.match(
		astroConfigSource,
		/webp:\s*\{\s*effort:\s*6,\s*alphaQuality:\s*80\s*\}/,
		"WebP defaults should remain preserved in the opt-in preset",
	);

	assert.match(
		astroConfigSource,
		/avif:\s*\{\s*effort:\s*4,\s*chromaSubsampling:\s*"4:2:0"\s*\}/,
		"AVIF defaults should remain preserved in the opt-in preset",
	);

	assert.match(
		astroConfigSource,
		/png:\s*\{\s*compressionLevel:\s*9\s*\}/,
		"PNG defaults should remain preserved in the opt-in preset",
	);

	assert.match(
		astroConfigSource,
		/\.\.\.\(enableGlobalImageCodecDefaults\s*\?[\s\S]*image:\s*\{[\s\S]*config:\s*globalImageServiceConfig,[\s\S]*:\s*\{\}\)/,
		"Astro config should gate image.service.config behind an explicit local switch",
	);

	assert.match(
		astroConfigSource,
		/codeFontFamily:\s*"var\(--font-jetbrains-mono\), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"/,
		"Expressive Code config should use the shared mono font variable",
	);

	assert.match(
		layoutSource,
		/import\s+\{\s*Font\s*\}\s+from\s+"astro:assets"/,
		"Layout.astro should render Astro Font components instead of raw @fontsource imports",
	);

	assert.match(
		layoutSource,
		/<Font\s+cssVariable="--font-roboto"\s+preload\s*\/>/,
		"Layout.astro should preload the primary body font",
	);

	assert.match(
		layoutSource,
		/<Font\s+cssVariable="--font-jetbrains-mono"\s*\/>/,
		"Layout.astro should register the code font through Astro Font API",
	);

	assert.doesNotMatch(
		layoutSource,
		/@fontsource\/roboto/,
		"Layout.astro should stop importing Roboto CSS files directly",
	);

	assert.doesNotMatch(
		markdownComponentSource,
		/@fontsource-variable\/jetbrains-mono/,
		"Markdown.astro should stop importing JetBrains Mono CSS files directly",
	);

	assert.match(
		tailwindThemeSource,
		/--font-sans:\s*var\(--font-roboto\),\s*sans-serif,\s*ui-sans-serif,\s*system-ui,\s*sans-serif;/,
		"Tailwind theme should source the sans stack from the Astro font variable",
	);

	assert.match(
		markdownStyleSource,
		/font-family:\s*var\(--font-jetbrains-mono\),\s*ui-monospace,\s*SFMono-Regular,\s*Menlo,\s*Monaco,\s*Consolas,\s*"Liberation Mono",\s*"Courier New",\s*monospace;/,
		"Markdown code styles should use the shared mono font variable",
	);

	assert.match(
		expressiveCodeStyleSource,
		/font-family:\s*var\(--font-jetbrains-mono\),\s*ui-monospace,\s*SFMono-Regular,\s*Menlo,\s*Monaco,\s*Consolas,\s*"Liberation Mono",\s*"Courier New",\s*monospace;/,
		"Expressive Code styles should use the shared mono font variable",
	);

	assert.match(
		languageBadgeSource,
		/font-family:\s*var\(--font-jetbrains-mono\),\s*ui-monospace,\s*SFMono-Regular,\s*Menlo,\s*Monaco,\s*Consolas,\s*"Liberation Mono",\s*"Courier New",\s*monospace;/,
		"Language badge plugin should use the shared mono font variable",
	);
});
