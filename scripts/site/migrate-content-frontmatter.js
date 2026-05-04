import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument, Scalar } from "yaml";

function write(stream, value) {
	stream.write(`${value}\n`);
}

function usage() {
	return `Usage:
  node scripts/site/migrate-content-frontmatter.js --site-root <path> --from commentStatus --to comment [--dry-run]
  node scripts/site/migrate-content-frontmatter.js --site-root <path> --from commentStatus --to comment --apply

Options:
  --site-root <path>   External site root to migrate.
  --from commentStatus Source frontmatter field. Only commentStatus is supported.
  --to comment         Target frontmatter field. Only comment is supported.
  --dry-run            Print planned actions without writing files. This is the default.
  --apply              Apply safe content frontmatter updates.
  --help               Show this help.`;
}

function getArgValue(argv, name) {
	const index = argv.indexOf(name);
	if (index < 0) {
		return undefined;
	}

	const value = argv[index + 1];
	if (!value || value.startsWith("--")) {
		throw new Error(`${name} requires a value.`);
	}

	return value;
}

export function parseContentFrontmatterMigrationArgs(
	argv = process.argv.slice(2),
) {
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
		from: getArgValue(argv, "--from") ?? "commentStatus",
		to: getArgValue(argv, "--to") ?? "comment",
		mode: apply ? "apply" : "dry-run",
		help: false,
	};
}

async function listMarkdownFiles(rootDir) {
	const files = [];

	async function walk(directory) {
		let entries;
		try {
			entries = await readdir(directory, { withFileTypes: true });
		} catch (error) {
			if (error && typeof error === "object" && error.code === "ENOENT") {
				return;
			}
			throw error;
		}

		for (const entry of entries) {
			const fullPath = path.join(directory, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
				continue;
			}
			if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
				files.push(fullPath);
			}
		}
	}

	await walk(rootDir);
	return files.sort((left, right) => left.localeCompare(right));
}

function parseCommentStatus(value) {
	const normalized = String(value ?? "").trim().toLowerCase();
	if (normalized === "open") {
		return true;
	}
	if (normalized === "closed") {
		return false;
	}
	return undefined;
}

function splitFrontmatter(source) {
	const normalizedSource = source.replace(/^\uFEFF/, "");
	if (!normalizedSource.startsWith("---\n") && !normalizedSource.startsWith("---\r\n")) {
		return null;
	}

	const newline = normalizedSource.startsWith("---\r\n") ? "\r\n" : "\n";
	const closeNeedle = `${newline}---${newline}`;
	const closeIndex = normalizedSource.indexOf(closeNeedle, 3);
	if (closeIndex < 0) {
		return null;
	}

	return {
		newline,
		yaml: normalizedSource.slice(3 + newline.length, closeIndex),
		body: normalizedSource.slice(closeIndex + closeNeedle.length),
	};
}

function getScalarValue(map, key) {
	const node = map.get(key, true);
	return node instanceof Scalar ? node.value : node;
}

export function migrateMarkdownCommentFrontmatter(source) {
	const parts = splitFrontmatter(source);
	if (!parts) {
		return {
			status: "unchanged",
			reason: "missing frontmatter",
			content: source,
		};
	}

	const document = parseDocument(parts.yaml);
	const frontmatter = document.contents;
	if (!frontmatter || typeof frontmatter.get !== "function") {
		return {
			status: "unchanged",
			reason: "frontmatter is not a map",
			content: source,
		};
	}

	if (!frontmatter.has("commentStatus")) {
		return {
			status: "unchanged",
			reason: "commentStatus not found",
			content: source,
		};
	}

	const nextComment = parseCommentStatus(getScalarValue(frontmatter, "commentStatus"));
	if (nextComment === undefined) {
		return {
			status: "manual",
			reason: `unknown commentStatus=${String(getScalarValue(frontmatter, "commentStatus"))}`,
			content: source,
		};
	}

	if (frontmatter.has("comment")) {
		const currentComment = getScalarValue(frontmatter, "comment");
		if (currentComment !== nextComment) {
			return {
				status: "manual",
				reason: `conflicting commentStatus=${String(getScalarValue(frontmatter, "commentStatus"))} and comment=${String(currentComment)}`,
				content: source,
			};
		}

		frontmatter.delete("commentStatus");
	} else {
		frontmatter.set("comment", nextComment);
		frontmatter.delete("commentStatus");
	}

	const nextYaml = document.toString().trimEnd();
	return {
		status: "planned",
		reason: "commentStatus -> comment",
		content: `---${parts.newline}${nextYaml}${parts.newline}---${parts.newline}${parts.body}`,
	};
}

export async function planContentFrontmatterMigration(siteRoot) {
	const contentRoot = path.join(siteRoot, "content");
	const targetRoots = [
		path.join(contentRoot, "posts"),
		path.join(contentRoot, "spec"),
	];
	const files = (
		await Promise.all(targetRoots.map((targetRoot) => listMarkdownFiles(targetRoot)))
	).flat();
	const actions = [];
	const manualActions = [];

	for (const filePath of files) {
		const source = await readFile(filePath, "utf8");
		const result = migrateMarkdownCommentFrontmatter(source);
		const relativePath = path.relative(siteRoot, filePath);

		if (result.status === "manual") {
			manualActions.push({
				file: relativePath,
				path: "commentStatus",
				reason: result.reason,
			});
			continue;
		}

		if (result.status === "planned") {
			actions.push({
				file: relativePath,
				action: "migrate",
				status: "planned",
				reason: result.reason,
				content: result.content,
			});
		}
	}

	return {
		siteRoot,
		actions,
		manualActions,
	};
}

export async function applyContentFrontmatterMigration(plan) {
	const actions = [];

	for (const action of plan.actions) {
		const targetPath = path.join(plan.siteRoot, action.file);
		await writeFile(targetPath, action.content, "utf8");
		actions.push({
			...action,
			status: "written",
		});
	}

	return {
		...plan,
		actions,
	};
}

function printReport(io, result) {
	write(io.stdout, "FangYuan content frontmatter migration");
	write(io.stdout, `Site root: ${result.siteRoot}`);
	write(io.stdout, `Mode: ${result.mode}`);
	write(io.stdout, "");
	write(io.stdout, "Actions:");

	if (result.actions.length === 0) {
		write(io.stdout, "- none");
	} else {
		for (const action of result.actions) {
			write(
				io.stdout,
				`- [${action.status}] ${action.file}: ${action.action} (${action.reason})`,
			);
		}
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
}

function isExecutedDirectly() {
	return process.argv[1] === fileURLToPath(import.meta.url);
}

export async function main(argv = process.argv.slice(2), io = process) {
	let args;

	try {
		args = parseContentFrontmatterMigrationArgs(argv);
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
	if (args.from !== "commentStatus" || args.to !== "comment") {
		write(io.stderr, "Only --from commentStatus --to comment is supported.");
		return 1;
	}

	const siteRoot = path.resolve(args.siteRoot);
	const plan = await planContentFrontmatterMigration(siteRoot);
	const result = {
		...plan,
		mode: args.mode,
	};

	if (args.mode === "apply" && result.manualActions.length > 0) {
		printReport(io, result);
		write(io.stderr, "Apply blocked by manual actions.");
		return 2;
	}

	if (args.mode === "apply") {
		const applied = await applyContentFrontmatterMigration(plan);
		result.actions = applied.actions;
	}

	printReport(io, result);
	return 0;
}

if (isExecutedDirectly()) {
	process.exitCode = await main();
}
