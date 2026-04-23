import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { UpdatedDateFallback, UpdatedDateMode } from "../types/config";

type UpdatedDateProvider = (filePath?: string) => Promise<Date | null>;

type ResolveUpdatedDateInput = {
	mode: UpdatedDateMode;
	fallback: UpdatedDateFallback;
	frontmatterUpdated?: Date;
	filePath?: string;
	gitProvider?: UpdatedDateProvider;
	filesystemProvider?: UpdatedDateProvider;
};

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();

function normalizeDate(
	value: Date | string | number | null | undefined,
): Date | null {
	if (value === null || value === undefined) {
		return null;
	}

	const dateValue = value instanceof Date ? value : new Date(value);
	return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

function resolveAbsoluteFilePath(filePath?: string): string | null {
	if (!filePath?.trim()) {
		return null;
	}

	return path.isAbsolute(filePath)
		? filePath
		: path.resolve(repoRoot, filePath);
}

function resolveGitFilePath(filePath?: string): string | null {
	const absoluteFilePath = resolveAbsoluteFilePath(filePath);
	if (!absoluteFilePath) {
		return null;
	}

	const relativeFilePath = path
		.relative(repoRoot, absoluteFilePath)
		.replace(/\\/g, "/");

	return relativeFilePath.startsWith("..") ? null : relativeFilePath;
}

export async function defaultGitUpdatedProvider(
	filePath?: string,
): Promise<Date | null> {
	const gitFilePath = resolveGitFilePath(filePath);
	if (!gitFilePath) {
		return null;
	}

	try {
		const result = await execFileAsync(
			"git",
			["log", "-1", "--format=%cI", "--", gitFilePath],
			{
				cwd: repoRoot,
				windowsHide: true,
			},
		);
		return normalizeDate(result.stdout.trim());
	} catch {
		return null;
	}
}

export async function defaultFilesystemUpdatedProvider(
	filePath?: string,
): Promise<Date | null> {
	const absoluteFilePath = resolveAbsoluteFilePath(filePath);
	if (!absoluteFilePath) {
		return null;
	}

	try {
		const fileStat = await stat(absoluteFilePath);
		return normalizeDate(fileStat.mtime);
	} catch {
		return null;
	}
}

export async function resolveUpdatedDate({
	mode,
	fallback,
	frontmatterUpdated,
	filePath,
	gitProvider = defaultGitUpdatedProvider,
	filesystemProvider = defaultFilesystemUpdatedProvider,
}: ResolveUpdatedDateInput): Promise<Date | null> {
	if (mode === "manual") {
		return normalizeDate(frontmatterUpdated);
	}

	if (mode === "none") {
		return null;
	}

	if (mode === "git") {
		const gitDate = await gitProvider(filePath);
		if (gitDate) {
			return gitDate;
		}

		return fallback === "filesystem"
			? await filesystemProvider(filePath)
			: null;
	}

	if (mode === "filesystem") {
		return filesystemProvider(filePath);
	}

	return null;
}
