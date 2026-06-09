import path from "node:path";
import { pathToFileURL } from "node:url";
import type { DataStore, Loader } from "astro/loaders";
import { resolveSiteSourceContext } from "./context.ts";

type DataEntry = Parameters<Parameters<Loader["load"]>[0]["store"]["set"]>[0];
type DataStoreWithContentImports = DataStore & {
	addAssetImport?: (assetImport: string, filePath?: string) => void;
	addAssetImports?: (assets: string[], filePath?: string) => void;
	addModuleImport?: (fileName: string) => void;
};

function normalizeSlashes(value: string): string {
	return value.replace(/\\/g, "/");
}

function isWindowsDrivePath(value: string): boolean {
	return /^[A-Za-z]:[\\/]/.test(value);
}

function filePathToAstroImporterPath(filePath: string): string {
	if (!isWindowsDrivePath(filePath)) {
		return normalizeSlashes(filePath);
	}

	return pathToFileURL(filePath).href;
}

export function normalizeExternalEntryFilePath(
	filePath?: string,
): string | undefined {
	if (!filePath?.trim()) {
		return filePath;
	}

	const siteSourceContext = resolveSiteSourceContext();
	if (!siteSourceContext.useExternalContent) {
		return normalizeSlashes(filePath);
	}

	if (filePath.startsWith("file://")) {
		return filePath;
	}

	const absoluteFilePath = path.isAbsolute(filePath)
		? filePath
		: path.resolve(process.env.FANGYUAN_ROOT ?? process.cwd(), filePath);
	const normalizedContentRoot = path.resolve(siteSourceContext.contentRoot);
	const relativeToContentRoot = path.relative(
		normalizedContentRoot,
		absoluteFilePath,
	);
	if (
		relativeToContentRoot === "" ||
		relativeToContentRoot.startsWith("..") ||
		path.isAbsolute(relativeToContentRoot)
	) {
		return normalizeSlashes(filePath);
	}

	return filePathToAstroImporterPath(absoluteFilePath);
}

function normalizeExternalStoreFilePath(filePath?: string): string | undefined {
	if (!filePath?.trim()) {
		return filePath;
	}

	const siteSourceContext = resolveSiteSourceContext();
	if (!siteSourceContext.useExternalContent) {
		return normalizeSlashes(filePath);
	}

	if (filePath.startsWith("file://")) {
		return filePath;
	}

	if (isWindowsDrivePath(filePath)) {
		return pathToFileURL(filePath).href;
	}

	if (path.isAbsolute(filePath)) {
		return normalizeSlashes(filePath);
	}

	return normalizeSlashes(filePath);
}

export function externalContentLoader(loader: Loader): Loader {
	return {
		...loader,
		name: `fangyuan-external-content-${loader.name}`,
		async load(context) {
			const sourceStore = context.store as DataStoreWithContentImports;
			const get: DataStore["get"] = <
				TData extends Record<string, unknown> = Record<string, unknown>,
			>(
				key: string,
			) => {
				const entry = sourceStore.get<TData>(key);
				if (!entry?.filePath) {
					return entry;
				}

				return {
					...entry,
					filePath: normalizeExternalEntryFilePath(entry.filePath),
				} as typeof entry;
			};
			const store: DataStoreWithContentImports = {
				...sourceStore,
				get,
				set(entry: DataEntry) {
					return sourceStore.set({
						...entry,
						filePath: normalizeExternalStoreFilePath(entry.filePath),
					});
				},
				...(sourceStore.addAssetImport
					? {
							addAssetImport(assetImport: string, filePath?: string) {
								return sourceStore.addAssetImport?.(
									assetImport,
									normalizeExternalEntryFilePath(filePath),
								);
							},
						}
					: {}),
				...(sourceStore.addAssetImports
					? {
							addAssetImports(assets: string[], filePath?: string) {
								return sourceStore.addAssetImports?.(
									assets,
									normalizeExternalEntryFilePath(filePath),
								);
							},
						}
					: {}),
				...(sourceStore.addModuleImport
					? {
							addModuleImport(fileName: string) {
								return sourceStore.addModuleImport?.(
									normalizeExternalEntryFilePath(fileName) ?? fileName,
								);
							},
						}
					: {}),
			};

			return loader.load({
				...context,
				store,
			});
		},
	};
}
