import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAuditReport } from "./wordpress-wxr-audit-core.js";

function trimString(value) {
	return typeof value === "string" ? value.trim() : "";
}

function parseBooleanFlag(value) {
	return trimString(value).toLowerCase() !== "false";
}

function parseList(value) {
	return trimString(value)
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

export function parseCliArgs(argv) {
	const options = {
		inputPath: "",
		outputDir: "",
		contentTypes: ["post", "page"],
		pathMode: "flat",
		useGmtDates: false,
		filenameSource: "title",
		wpPermalinkTemplate: "",
		detectLinkPattern: true,
		legacyIdField: "legacyId",
		aliasField: "alias",
		permalinkCandidateField: "permalinkCandidate",
		aliasRawField: "aliasRaw",
		reportFormats: ["json", "md"],
		defaultFrontmatter: {},
	};

	for (let index = 0; index < argv.length; index += 2) {
		const flag = argv[index];
		const value = argv[index + 1];
		if (!flag?.startsWith("--") || value === undefined) {
			throw new Error(`Invalid argument pair: ${flag ?? "<missing>"}`);
		}

		switch (flag) {
			case "--input":
				options.inputPath = trimString(value);
				break;
			case "--output":
				options.outputDir = trimString(value);
				break;
			case "--content-types":
				options.contentTypes = parseList(value);
				break;
			case "--path-mode":
				options.pathMode = trimString(value);
				break;
			case "--use-gmt-dates":
				options.useGmtDates = parseBooleanFlag(value);
				break;
			case "--filename-source":
				options.filenameSource = trimString(value);
				break;
			case "--wp-permalink-template":
				options.wpPermalinkTemplate = trimString(value);
				break;
			case "--detect-link-pattern":
				options.detectLinkPattern = parseBooleanFlag(value);
				break;
			case "--legacy-id-field":
				options.legacyIdField = trimString(value);
				break;
			case "--alias-field":
				options.aliasField = trimString(value);
				break;
			case "--permalink-candidate-field":
				options.permalinkCandidateField = trimString(value);
				break;
			case "--alias-raw-field":
				options.aliasRawField = trimString(value);
				break;
			case "--report-formats":
				options.reportFormats = parseList(value);
				break;
			case "--default-frontmatter": {
				const [key, fieldValue] = value.split("=");
				if (!trimString(key)) {
					throw new Error("--default-frontmatter requires key=value");
				}
				options.defaultFrontmatter[trimString(key)] = fieldValue ?? "";
				break;
			}
			default:
				throw new Error(`Unknown flag: ${flag}`);
		}
	}

	if (!options.inputPath) {
		throw new Error("--input is required");
	}
	if (!options.outputDir) {
		throw new Error("--output is required");
	}

	return options;
}

async function writeReportFiles(report, outputDir, reportFormats) {
	await mkdir(outputDir, { recursive: true });
	const writes = [];
	if (reportFormats.includes("json")) {
		const filePath = path.join(outputDir, "audit-report.json");
		await writeFile(filePath, JSON.stringify(report, null, 2), "utf8");
		writes.push(filePath);
	}
	if (reportFormats.includes("md")) {
		const filePath = path.join(outputDir, "audit-summary.md");
		await writeFile(filePath, report.summary.markdown, "utf8");
		writes.push(filePath);
	}
	if (reportFormats.includes("csv")) {
		const filePath = path.join(outputDir, "audit-index.csv");
		await writeFile(filePath, report.summary.csv, "utf8");
		writes.push(filePath);
	}
	return writes;
}

export async function runWordpressAuditCli(argv, runtime = {}) {
	const options = parseCliArgs(argv);
	const cwd = runtime.cwd ?? process.cwd();
	const inputPath = path.resolve(cwd, options.inputPath);
	const outputDir = path.resolve(cwd, options.outputDir);
	const source = await readFile(inputPath, "utf8");
	const report = buildAuditReport(source, {
		contentTypes: options.contentTypes,
		pathMode: options.pathMode,
		useGmtDates: options.useGmtDates,
		filenameSource: options.filenameSource,
		reportFormats: options.reportFormats,
		wpPermalinkTemplate: options.wpPermalinkTemplate,
		detectLinkPattern: options.detectLinkPattern,
		defaultFrontmatter: options.defaultFrontmatter,
		inputPath,
		legacyIdField: options.legacyIdField,
		aliasField: options.aliasField,
		permalinkCandidateField: options.permalinkCandidateField,
		aliasRawField: options.aliasRawField,
	});
	const writtenFiles = await writeReportFiles(report, outputDir, options.reportFormats);
	return { options, outputDir, report, writtenFiles };
}

function isExecutedDirectly() {
	return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isExecutedDirectly()) {
	const result = await runWordpressAuditCli(process.argv.slice(2));
	console.log(`Wrote ${result.writtenFiles.length} files to ${result.outputDir}`);
}
