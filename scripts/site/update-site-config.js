import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";
import {
	backupExistingFile,
	formatUpdateTimestamp,
} from "./update-site-backup.js";
import {
	currentSiteConfigVersion,
	migrateSiteConfigObject,
} from "./update-site-config-migrations.js";

function toYaml(config) {
	return stringify(config).replace(/\n*$/, "\n");
}

export async function planSiteConfigUpdate(siteRoot, options = {}) {
	const configPath = path.join(siteRoot, "site.config.yaml");

	try {
		const source = await readFile(configPath, "utf8");
		const parsed = parse(source) ?? {};
		const migration = migrateSiteConfigObject(parsed, options);
		const writeNeeded = migration.changed && migration.manualActions.length === 0;

		return {
			siteRoot,
			file: "site.config.yaml",
			configPath,
			source,
			content: writeNeeded ? toYaml(migration.config) : source,
			currentVersion: migration.fromVersion,
			targetVersion: migration.toVersion,
			writeNeeded,
			actions:
				migration.actions.length > 0
					? migration.actions
					: [
							{
								file: "site.config.yaml",
								action: "migrate",
								status: writeNeeded ? "planned" : "unchanged",
							},
						],
			manualActions: migration.manualActions,
		};
	} catch (error) {
		if (error && typeof error === "object" && error.code === "ENOENT") {
			return {
				siteRoot,
				file: "site.config.yaml",
				configPath,
				content: "",
				currentVersion: null,
				targetVersion: currentSiteConfigVersion,
				writeNeeded: false,
				actions: [
					{
						file: "site.config.yaml",
						action: "read",
						status: "missing",
						reason: "site.config.yaml not found",
					},
				],
				manualActions: [],
			};
		}

		return {
			siteRoot,
			file: "site.config.yaml",
			configPath,
			content: "",
			currentVersion: null,
			targetVersion: currentSiteConfigVersion,
			writeNeeded: false,
			actions: [
				{
					file: "site.config.yaml",
					action: "parse",
					status: "failed",
					reason: error.message,
				},
			],
			manualActions: [
				{
					file: "site.config.yaml",
					path: "site.config.yaml",
					reason: error.message,
				},
			],
		};
	}
}

export async function applySiteConfigUpdate(plan, options = {}) {
	if (plan.manualActions.length > 0) {
		return {
			...plan,
			status: "blocked",
		};
	}

	if (!plan.writeNeeded) {
		return {
			...plan,
			status: "unchanged",
		};
	}

	const timestamp = options.timestamp ?? formatUpdateTimestamp(options.now);
	const backupPath = await backupExistingFile(plan.siteRoot, plan.file, {
		timestamp,
	});

	await writeFile(plan.configPath, plan.content, "utf8");

	return {
		...plan,
		status: "written",
		...(backupPath ? { backupPath } : {}),
		actions: plan.actions.map((action) => ({
			...action,
			status: "written",
			...(backupPath ? { backupPath } : {}),
		})),
	};
}
