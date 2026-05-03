import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fangyuanRoot as defaultFangYuanRoot } from "../project-root.ts";

export type SiteSourceMode = "auto" | "internal" | "external";

export type SiteSourceContext = {
	mode: SiteSourceMode;
	siteRoot: string | null;
	contentRoot: "./src/content" | string;
	externalConfigPath: string | null;
	useExternalContent: boolean;
	useExternalConfig: boolean;
};

function directoryHasFiles(directoryPath: string): boolean {
	if (!existsSync(directoryPath)) {
		return false;
	}

	for (const entry of readdirSync(directoryPath, { withFileTypes: true })) {
		const entryPath = path.join(directoryPath, entry.name);
		if (entry.isFile()) {
			return true;
		}
		if (entry.isDirectory() && directoryHasFiles(entryPath)) {
			return true;
		}
	}

	return false;
}

function parseMode(value: string | undefined): SiteSourceMode {
	if (value === "internal" || value === "external" || value === "auto") {
		return value;
	}

	return "auto";
}

export function resolveSiteSourceContext({
	cwd,
	fangyuanRoot = cwd ?? defaultFangYuanRoot,
	env = process.env,
}: {
	cwd?: string;
	fangyuanRoot?: string;
	env?: NodeJS.ProcessEnv;
} = {}): SiteSourceContext {
	const mode = parseMode(env.FANGYUAN_SITE_MODE);
	const siteRoot = path.resolve(fangyuanRoot, env.FANGYUAN_SITE_ROOT ?? "site");
	const externalContentRoot = path.join(siteRoot, "content");
	const externalConfigPath = path.join(siteRoot, "site.config.yaml");
	const hasExternalContent = directoryHasFiles(externalContentRoot);
	const hasExternalConfig = existsSync(externalConfigPath);

	if (mode === "internal") {
		return {
			mode,
			siteRoot,
			contentRoot: "./src/content",
			externalConfigPath,
			useExternalContent: false,
			useExternalConfig: false,
		};
	}

	if (mode === "external") {
		if (!existsSync(siteRoot)) {
			throw new Error(`External site root not found: ${siteRoot}`);
		}
		if (!hasExternalContent) {
			throw new Error(
				`External site content is missing or empty: ${externalContentRoot}`,
			);
		}
		if (!hasExternalConfig) {
			throw new Error(`External site config not found: ${externalConfigPath}`);
		}

		return {
			mode,
			siteRoot,
			contentRoot: externalContentRoot,
			externalConfigPath,
			useExternalContent: true,
			useExternalConfig: true,
		};
	}

	return {
		mode,
		siteRoot,
		contentRoot: hasExternalContent ? externalContentRoot : "./src/content",
		externalConfigPath,
		useExternalContent: hasExternalContent,
		useExternalConfig: hasExternalContent && hasExternalConfig,
	};
}
