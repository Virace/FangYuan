import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { transformWxrToPreview } from "./wordpress-wxr-transform-core.js";

function trimString(value) {
	return typeof value === "string" ? value.trim() : "";
}

function parseList(value) {
	return trimString(value)
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

function parseBooleanFlag(value) {
	return trimString(value).toLowerCase() !== "false";
}

export function parseTransformCliArgs(argv) {
	const options = {
		inputPath: "",
		outputDir: "",
		contentTypes: ["post", "page"],
		pathMode: "flat",
		useGmtDates: false,
		wpPermalinkTemplate: "",
		detectLinkPattern: true,
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
			case "--wp-permalink-template":
				options.wpPermalinkTemplate = trimString(value);
				break;
			case "--detect-link-pattern":
				options.detectLinkPattern = parseBooleanFlag(value);
				break;
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

export async function runWordpressTransformCli(argv, runtime = {}) {
	const options = parseTransformCliArgs(argv);
	const cwd = runtime.cwd ?? process.cwd();
	const inputPath = path.resolve(cwd, options.inputPath);
	const outputDir = path.resolve(cwd, options.outputDir);
	const source = await readFile(inputPath, "utf8");
	const result = transformWxrToPreview(source, options);

	await mkdir(outputDir, { recursive: true });
	const writtenFiles = [];
	for (const entry of result.entries) {
		const absolutePath = path.join(outputDir, entry.candidateRelativePath);
		await mkdir(path.dirname(absolutePath), { recursive: true });
		await writeFile(absolutePath, entry.markdown, "utf8");
		writtenFiles.push(absolutePath);
	}

	const summaryPath = path.join(outputDir, "transform-summary.json");
	await writeFile(summaryPath, JSON.stringify(result, null, 2), "utf8");
	writtenFiles.push(summaryPath);

	return {
		...result,
		outputDir,
		writtenFiles,
	};
}

function isExecutedDirectly() {
	return process.argv[1] === fileURLToPath(import.meta.url);
}

if (isExecutedDirectly()) {
	const result = await runWordpressTransformCli(process.argv.slice(2));
	console.log(`Wrote ${result.writtenFiles.length} files to ${result.outputDir}`);
}
