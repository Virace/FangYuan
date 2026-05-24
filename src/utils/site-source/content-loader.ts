import path from "node:path";
import { pathToFileURL } from "node:url";
import type { DataStore, Loader } from "astro/loaders";
import { resolveSiteSourceContext } from "./context";

type DataEntry = Parameters<Parameters<Loader["load"]>[0]["store"]["set"]>[0];

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

export function externalContentLoader(loader: Loader): Loader {
	return {
		...loader,
		name: `fangyuan-external-content-${loader.name}`,
		async load(context) {
			const get: DataStore["get"] = <
				TData extends Record<string, unknown> = Record<string, unknown>,
			>(
				key: string,
			) => {
				const entry = context.store.get<TData>(key);
				if (!entry?.filePath) {
					return entry;
				}

				return {
					...entry,
					filePath: normalizeExternalEntryFilePath(entry.filePath),
				} as typeof entry;
			};

			return loader.load({
				...context,
				store: {
					...context.store,
					get,
					set(entry: DataEntry) {
						return context.store.set({
							...entry,
							filePath: normalizeExternalEntryFilePath(entry.filePath),
						});
					},
				},
			});
		},
	};
}
