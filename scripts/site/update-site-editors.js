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

function valuesEqual(left, right) {
	return JSON.stringify(left) === JSON.stringify(right);
}

function getContentTypes(config) {
	return Array.isArray(config?.["frontMatter.taxonomy.contentTypes"])
		? config["frontMatter.taxonomy.contentTypes"]
		: [];
}

function mergeFields(existingFields, managedFields, notes, contentTypeName) {
	const fields = Array.isArray(existingFields) ? [...existingFields] : [];
	const indexByName = new Map(
		fields
			.map((field, index) =>
				typeof field?.name === "string" ? [field.name, index] : null,
			)
			.filter(Boolean),
	);

	for (const managedField of managedFields) {
		const fieldName = managedField?.name;
		if (typeof fieldName !== "string") {
			continue;
		}

		const existingIndex = indexByName.get(fieldName);
		if (existingIndex === undefined) {
			fields.push(managedField);
			indexByName.set(fieldName, fields.length - 1);
			notes.push(
				`frontMatter.taxonomy.contentTypes.${contentTypeName}.fields.${fieldName}`,
			);
			continue;
		}

		fields[existingIndex] = {
			...fields[existingIndex],
			...managedField,
		};
	}

	return fields;
}

export function mergeFrontmatterConfig(existing, managed) {
	const config =
		existing && typeof existing === "object" && !Array.isArray(existing)
			? { ...existing }
			: {};
	const notes = [];

	for (const key of [
		"frontMatter.content.publicFolder",
		"frontMatter.content.pageFolders",
	]) {
		if (!valuesEqual(config[key], managed[key])) {
			config[key] = managed[key];
			notes.push(key);
		}
	}

	const existingTypes = getContentTypes(config);
	const managedTypes = getContentTypes(managed);
	const mergedTypes = [...existingTypes];
	const typeIndexByName = new Map(
		mergedTypes
			.map((contentType, index) =>
				typeof contentType?.name === "string"
					? [contentType.name, index]
					: null,
			)
			.filter(Boolean),
	);

	for (const managedType of managedTypes) {
		const typeName = managedType?.name;
		if (typeof typeName !== "string") {
			continue;
		}

		const existingIndex = typeIndexByName.get(typeName);
		if (existingIndex === undefined) {
			mergedTypes.push(managedType);
			typeIndexByName.set(typeName, mergedTypes.length - 1);
			notes.push(`frontMatter.taxonomy.contentTypes.${typeName}`);
			continue;
		}

		const existingType = mergedTypes[existingIndex];
		const nextType = {
			...existingType,
			...managedType,
			fields: mergeFields(
				existingType.fields,
				managedType.fields,
				notes,
				typeName,
			),
		};
		if (!valuesEqual(existingType, nextType)) {
			mergedTypes[existingIndex] = nextType;
		}
	}

	if (!valuesEqual(config["frontMatter.taxonomy.contentTypes"], mergedTypes)) {
		config["frontMatter.taxonomy.contentTypes"] = mergedTypes;
	}

	return {
		config,
		notes,
	};
}

async function loadManagedExternalFrontmatterConfig() {
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

	return config;
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
		const targetFrontmatterPath = path.join(siteRoot, "frontmatter.json");
		const existingConfig = await readJsonFile(targetFrontmatterPath, {});
		const managedConfig = await loadManagedExternalFrontmatterConfig();
		const { config, notes } = mergeFrontmatterConfig(
			existingConfig,
			managedConfig,
		);
		const content = toPrettyJson(config);
		const existingContent = toPrettyJson(existingConfig);
		actions.push({
			file: "frontmatter.json",
			action: "merge",
			status: content === existingContent ? "unchanged" : "planned",
			...(notes.length > 0 ? { path: notes.join(", ") } : {}),
			content,
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
		if (action.status === "unchanged") {
			actions.push(action);
			continue;
		}

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
