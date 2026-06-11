import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	applyEditorUpdates,
	planEditorUpdates,
} from "./update-site-editors.js";
import {
	applySiteConfigUpdate,
	planSiteConfigUpdate,
} from "./update-site-config.js";

function write(stream, value) {
	stream.write(`${value}\n`);
}

function usage() {
	return `Usage:
  node scripts/site/update-site.js --site-root <path> [--dry-run]
  node scripts/site/update-site.js --site-root <path> --apply

Options:
  --site-root <path>   External site root to update.
  --dry-run            Print planned actions without writing files. This is the default.
  --apply              Apply safe updates.
  --no-frontmatter     Skip frontmatter.json.
  --no-vscode          Skip .vscode files.
  --no-config          Skip site.config.yaml.
  --help               Show this help.`;
}

function getArgValue(argv, name) {
	const index = argv.indexOf(name);
	if (index < 0) {
		return undefined;
	}

	const value = argv[index + 1];
	if (!value || value.startsWith("--")) {
		throw new Error(`${name} requires a path value.`);
	}

	return value;
}

export function parseUpdateSiteArgs(argv = process.argv.slice(2)) {
	if (argv.includes("--help")) {
		return { help: true };
	}

	const dryRun = argv.includes("--dry-run");
	const apply = argv.includes("--apply");

	if (dryRun && apply) {
		throw new Error("--dry-run and --apply are mutually exclusive.");
	}

	return {
		siteRoot: getArgValue(argv, "--site-root"),
		mode: apply ? "apply" : "dry-run",
		includeFrontmatter: !argv.includes("--no-frontmatter"),
		includeVSCode: !argv.includes("--no-vscode"),
		includeConfig: !argv.includes("--no-config"),
		help: false,
	};
}

function formatAction(action) {
	const reason = action.reason ? ` (${action.reason})` : "";
	const detail = action.path ? ` ${action.path}` : "";
	const added =
		action.added && action.added.length > 0
			? ` add ${action.added.join(", ")}`
			: "";
	const backup = action.backupPath ? ` backup ${action.backupPath}` : "";
	return `- [${action.status}] ${action.file}: ${action.action}${detail}${added}${reason}${backup}`;
}

function collectActions(editorPlan, configPlan) {
	return [
		...(editorPlan?.actions ?? []),
		...(configPlan?.actions ?? []),
	];
}

function collectManualActions(editorPlan, configPlan) {
	return [
		...(editorPlan?.manualActions ?? []),
		...(configPlan?.manualActions ?? []),
	];
}

function hasFailedAction(actions) {
	return actions.some((action) => action.status === "failed");
}

function printReport(io, result) {
	write(io.stdout, "FangYuan external site update");
	write(io.stdout, `Site root: ${result.siteRoot}`);
	write(io.stdout, `Mode: ${result.mode}`);
	write(io.stdout, "");
	write(io.stdout, "Actions:");

	for (const action of result.actions) {
		write(io.stdout, formatAction(action));
	}

	if (result.actions.length === 0) {
		write(io.stdout, "- none");
	}

	write(io.stdout, "");
	write(io.stdout, "Manual actions:");
	if (result.manualActions.length === 0) {
		write(io.stdout, "- none");
	} else {
		for (const action of result.manualActions) {
			write(io.stdout, `- ${action.file}: ${action.path} (${action.reason})`);
		}
	}

	const backupPaths = [
		...new Set(result.actions.map((action) => action.backupPath).filter(Boolean)),
	];

	if (backupPaths.length > 0) {
		write(io.stdout, "");
		write(io.stdout, "Backups:");
		for (const backupPath of backupPaths) {
			write(io.stdout, `- ${backupPath}`);
		}
	}
}

function isExecutedDirectly() {
	return process.argv[1] === fileURLToPath(import.meta.url);
}

export async function main(argv = process.argv.slice(2), io = process) {
	let args;

	try {
		args = parseUpdateSiteArgs(argv);
	} catch (error) {
		write(io.stderr, error.message);
		return 1;
	}

	if (args.help) {
		write(io.stdout, usage());
		return 0;
	}

	if (!args.siteRoot) {
		write(io.stderr, "--site-root is required.");
		return 1;
	}

	const siteRoot = path.resolve(args.siteRoot);
	const editorPlan =
		args.includeFrontmatter || args.includeVSCode
			? await planEditorUpdates(siteRoot, {
					frontmatter: args.includeFrontmatter,
					vscode: args.includeVSCode,
				})
			: { actions: [], manualActions: [] };
	const configPlan = args.includeConfig
		? await planSiteConfigUpdate(siteRoot)
		: { actions: [], manualActions: [] };
	const manualActions = collectManualActions(editorPlan, configPlan);
	const result = {
		siteRoot,
		mode: args.mode,
		actions: collectActions(editorPlan, configPlan),
		manualActions,
	};

	if (hasFailedAction(result.actions)) {
		printReport(io, result);
		write(io.stderr, "Update failed.");
		return 1;
	}

	if (args.mode === "apply" && manualActions.length > 0) {
		printReport(io, result);
		write(io.stderr, "Apply blocked by manual actions.");
		return 2;
	}

	if (args.mode === "apply") {
		const timestamp = io.timestamp;
		const appliedEditorPlan =
			editorPlan.actions.length > 0
				? await applyEditorUpdates(editorPlan, {
						now: io.now,
						timestamp,
					})
				: { actions: [] };
		const appliedConfigPlan =
			args.includeConfig && configPlan
				? await applySiteConfigUpdate(configPlan, {
						now: io.now,
						timestamp,
					})
				: null;

		result.actions = collectActions(appliedEditorPlan, appliedConfigPlan);
	}

	printReport(io, result);
	return 0;
}

if (isExecutedDirectly()) {
	process.exitCode = await main();
}
