const encodedWindowsDriveImporterPattern =
	/([?&]importer=)([A-Za-z]%3A(?:%2F|%5C)[^"'`\\&\s]*)/gi;

function isWindowsDrivePath(value: string): boolean {
	return /^[A-Za-z]:[\\/]/.test(value);
}

function encodeFileUrlPathSegment(segment: string, index: number): string {
	const encodedSegment = encodeURIComponent(segment);
	return index === 0 ? encodedSegment.replace(/%3A$/i, ":") : encodedSegment;
}

function windowsDrivePathToFileUrl(filePath: string): string {
	return `file:///${filePath
		.replace(/\\/g, "/")
		.split("/")
		.map(encodeFileUrlPathSegment)
		.join("/")}`;
}

export function normalizeAstroContentImageImporterQuery(value: string): string {
	return value.replace(
		encodedWindowsDriveImporterPattern,
		(match, prefix: string, encodedImporter: string) => {
			let importer: string;
			try {
				importer = decodeURIComponent(encodedImporter);
			} catch {
				return match;
			}

			if (!isWindowsDrivePath(importer)) {
				return match;
			}

			return `${prefix}${encodeURIComponent(windowsDrivePathToFileUrl(importer))}`;
		},
	);
}
