import { existsSync } from "node:fs";
import path from "node:path";
import type { ImageMetadata } from "astro";

export type ImageBaseRoot = "src" | "site";
export type ResolvedImageSource = ImageMetadata | string | undefined;

const repoRoot = process.cwd();
const publicRoot = path.join(repoRoot, "public");

const localImageModules = import.meta.glob<ImageMetadata>(
	["/src/**/*.{avif,gif,jpeg,jpg,png,svg,webp}", "/site/**/*.{avif,gif,jpeg,jpg,png,svg,webp}"],
	{ import: "default" },
);

function normalizeSlashes(value: string): string {
	return value.replace(/\\/g, "/");
}

function normalizeRootRelativePath(value: string): string {
	return path.posix.normalize(normalizeSlashes(value));
}

function isRemoteImage(value: string): boolean {
	return /^https?:\/\//.test(value);
}

function isDataImage(value: string): boolean {
	return value.startsWith("data:");
}

function isPublicUrl(value: string): boolean {
	return value.startsWith("/");
}

function isPublicAlias(value: string): boolean {
	return value.startsWith("public/");
}

function isRelativePath(value: string): boolean {
	return /^(?:\.\.?\/)/.test(value);
}

function toPublicFilePath(value: string): string {
	if (isPublicAlias(value)) {
		return path.join(publicRoot, value.slice("public/".length));
	}

	return path.join(publicRoot, value.replace(/^\/+/, ""));
}

function toPublicUrl(value: string): string {
	if (isPublicAlias(value)) {
		return `/${normalizeSlashes(value.slice("public/".length)).replace(/^\/+/, "")}`;
	}

	return value;
}

function assertPublicFileExists(value: string): string {
	const targetPath = toPublicFilePath(value);
	if (!existsSync(targetPath)) {
		throw new Error(`[image-source] Public image file not found: ${targetPath}`);
	}
	return toPublicUrl(value);
}

function assertAllowedRoot(rootRelativePath: string): string {
	if (
		!rootRelativePath.startsWith("/src/") &&
		!rootRelativePath.startsWith("/site/")
	) {
		throw new Error(
			`[image-source] Local image path must stay inside /src or /site. Received: ${rootRelativePath}`,
		);
	}

	return rootRelativePath;
}

async function resolveLocalModule(rootRelativePath: string): Promise<ImageMetadata> {
	const importer = localImageModules[rootRelativePath];
	if (!importer) {
		throw new Error(
			`[image-source] Local image file not found: ${rootRelativePath}`,
		);
	}
	return await importer();
}

function inferEntryBaseRoot(entryFilePath: string | undefined): ImageBaseRoot {
	if (entryFilePath?.startsWith("site/")) {
		return "site";
	}

	return "src";
}

async function resolveRootAlias(
	value: string,
	preferredRoot: ImageBaseRoot,
): Promise<ImageMetadata> {
	const roots: ImageBaseRoot[] =
		preferredRoot === "site" ? ["site", "src"] : ["src", "site"];

	for (const root of roots) {
		const candidate = assertAllowedRoot(
			normalizeRootRelativePath(`/${root}/${value}`),
		);
		const importer = localImageModules[candidate];
		if (importer) {
			return await importer();
		}
	}

	throw new Error(
		`[image-source] Local image alias not found under /${preferredRoot} or the alternate root: ${value}`,
	);
}

export async function resolveContentImage(
	value: ImageMetadata | string | undefined,
	entryFilePath: string | undefined,
): Promise<ResolvedImageSource> {
	if (!value) {
		return undefined;
	}

	if (typeof value !== "string") {
		return value;
	}

	if (isRemoteImage(value) || isDataImage(value)) {
		return value;
	}

	if (isPublicUrl(value) || isPublicAlias(value)) {
		return assertPublicFileExists(value);
	}

	if (isRelativePath(value)) {
		if (!entryFilePath) {
			throw new Error(
				`[image-source] Missing entry.filePath for relative local image: ${value}`,
			);
		}

		const entryDirectory = path.posix.dirname(
			normalizeRootRelativePath(`/${normalizeSlashes(entryFilePath).replace(/^\/+/, "")}`),
		);
		const candidate = assertAllowedRoot(
			normalizeRootRelativePath(path.posix.join(entryDirectory, value)),
		);

		return resolveLocalModule(candidate);
	}

	return resolveRootAlias(value, inferEntryBaseRoot(entryFilePath));
}

export async function resolveConfigImage(
	value: string | undefined,
	baseRoot: ImageBaseRoot,
): Promise<ResolvedImageSource> {
	if (!value || value.trim() === "") {
		return undefined;
	}

	if (isRemoteImage(value) || isDataImage(value)) {
		return value;
	}

	if (isPublicUrl(value) || isPublicAlias(value)) {
		return assertPublicFileExists(value);
	}

	return resolveRootAlias(value, baseRoot);
}
