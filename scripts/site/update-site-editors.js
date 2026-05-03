import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	backupExistingFile,
	formatUpdateTimestamp,
} from "./update-site-backup.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(currentDir, "..", "..");
const frontmatterTemplatePath = path.join(repoRoot, "frontmatter.json");
const vscodeExtensionsPath = path.join(repoRoot, ".vscode", "extensions.json");

const managedVSCodeSettings = {
	"frontMatter.dashboard.openOnStart": false,
};

async function readJsonFile(filePath, fallback) {
	try {
		return JSON.parse(await readFile(filePath, "utf8"));
	} catch (error) {
		if (error && typeof error === "object" && error.code === "ENOENT") {
			return fallback;
		}
		throw error;
	}
}

function toPrettyJson(value) {
	return `${JSON.stringify(value, null, 2)}\n`;
}

async function renderExternalFrontmatterConfig() {
	const config = await readJsonFile(frontmatterTemplatePath, {});

	config["frontMatter.content.publicFolder"] = "assets";
	config["frontMatter.content.pageFolders"] = [
		{
			title: "posts",
			path: "[[workspace]]/content/posts",
			contentTypes: ["default"],
		},
		{
			title: "spec",
			path: "[[workspace]]/content/spec",
			contentTypes: ["spec"],
		},
	];

	return toPrettyJson(config);
}

function getRecommendations(value) {
	return Array.isArray(value?.recommendations) ? value.recommendations : [];
}

export function mergeRecommendations(existing, recommended) {
	const seen = new Set();
	const merged = [];

	for (const value of [...existing, ...recommended]) {
		if (typeof value !== "string") {
			continue;
		}

		const key = value.toLowerCase();
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		merged.push(value);
	}

	return merged;
}

export function mergeVSCodeSettings(existing, managed) {
	return {
		...(existing && typeof existing === "object" ? existing : {}),
		...managed,
	};
}

export async function planEditorUpdates(siteRoot, options = {}) {
	const actions = [];
	const manualActions = [];
	const includeFrontmatter = options.frontmatter !== false;
	const includeVSCode = options.vscode !== false;

	if (includeFrontmatter) {
		actions.push({
			file: "frontmatter.json",
			action: "overwrite",
			status: "planned",
			content: await renderExternalFrontmatterConfig(),
		});
	}

	if (includeVSCode) {
		const sourceExtensions = await readJsonFile(vscodeExtensionsPath, {
			recommendations: ["eliostruyf.vscode-front-matter"],
		});
		const targetExtensionsPath = path.join(
			siteRoot,
			".vscode",
			"extensions.json",
		);
		const targetExtensions = await readJsonFile(targetExtensionsPath, {
			recommendations: [],
		});
		const recommendations = mergeRecommendations(
			getRecommendations(targetExtensions),
			getRecommendations(sourceExtensions),
		);

		actions.push({
			file: ".vscode/extensions.json",
			action: "merge",
			status: "planned",
			added: recommendations.filter(
				(value) =>
					!getRecommendations(targetExtensions).some(
						(existing) => existing.toLowerCase() === value.toLowerCase(),
					),
			),
			content: toPrettyJson({
				...targetExtensions,
				recommendations,
			}),
		});

		const settingsPath = path.join(siteRoot, ".vscode", "settings.json");
		const settings = await readJsonFile(settingsPath, {});

		actions.push({
			file: ".vscode/settings.json",
			action: "merge",
			status: "planned",
			content: toPrettyJson(
				mergeVSCodeSettings(settings, managedVSCodeSettings),
			),
		});
	}

	return {
		siteRoot,
		actions,
		manualActions,
	};
}

export async function applyEditorUpdates(plan, options = {}) {
	const actions = [];
	const timestamp = options.timestamp ?? formatUpdateTimestamp(options.now);

	for (const action of plan.actions) {
		const targetPath = path.join(plan.siteRoot, action.file);
		const backupPath = await backupExistingFile(plan.siteRoot, action.file, {
			timestamp,
		});
		await mkdir(path.dirname(targetPath), { recursive: true });
		await writeFile(targetPath, action.content, "utf8");
		actions.push({
			...action,
			status: "written",
			...(backupPath ? { backupPath } : {}),
		});
	}

	return {
		...plan,
		actions,
	};
}
