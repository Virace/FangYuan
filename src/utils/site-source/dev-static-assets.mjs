import fs from "node:fs";
import path from "node:path";

const astroDevToolbarSourcemapUrl =
	"/@id/astro/runtime/client/dev-toolbar/astro_runtime_client_dev-toolbar_entrypoint__js.js.map";
const astroDevToolbarSourcemapFile =
	"astro_runtime_client_dev-toolbar_entrypoint__js.js.map";

function getPathname(url) {
	return url.split("?")[0] ?? "";
}

function endText(res, statusCode, message) {
	res.statusCode = statusCode;
	res.end(message);
}

function serveFile(res, filePath, contentType) {
	res.statusCode = 200;
	res.setHeader("Content-Type", contentType);
	fs.createReadStream(filePath).pipe(res);
}

function decodeExternalSiteAssetUrl(url, prefix) {
	const pathname = getPathname(url);
	if (!pathname.startsWith(prefix)) {
		return null;
	}

	try {
		return decodeURIComponent(pathname.slice(prefix.length));
	} catch {
		return "";
	}
}

function isInsideDirectory(parent, target) {
	const relativePath = path.relative(parent, target);
	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
	);
}

export function resolveAstroDevToolbarSourcemapPath(
	url,
	{ cwd = process.cwd() } = {},
) {
	if (getPathname(url) !== astroDevToolbarSourcemapUrl) {
		return null;
	}

	return path.join(
		cwd,
		"node_modules",
		".vite",
		"deps",
		astroDevToolbarSourcemapFile,
	);
}

export function createDevStaticAssetMiddleware({
	cwd = process.cwd(),
	externalSiteRoot,
	externalSiteAssetDevPrefix,
	getMimeType,
	isExternalSiteAsset,
}) {
	const normalizedExternalSiteRoot = path.resolve(externalSiteRoot);

	return function devStaticAssetMiddleware(req, res, next) {
		if (!req.url) {
			next();
			return;
		}

		const toolbarSourcemapPath = resolveAstroDevToolbarSourcemapPath(req.url, {
			cwd,
		});
		if (toolbarSourcemapPath) {
			if (!fs.existsSync(toolbarSourcemapPath)) {
				endText(res, 404, "Not Found");
				return;
			}

			serveFile(res, toolbarSourcemapPath, "application/json");
			return;
		}

		const reference = decodeExternalSiteAssetUrl(
			req.url,
			externalSiteAssetDevPrefix,
		);
		if (reference === null) {
			next();
			return;
		}

		if (!reference || !isExternalSiteAsset(reference)) {
			endText(res, 404, "Not Found");
			return;
		}

		const targetPath = path.resolve(normalizedExternalSiteRoot, reference);
		if (!isInsideDirectory(normalizedExternalSiteRoot, targetPath)) {
			endText(res, 403, "Forbidden");
			return;
		}

		if (!fs.existsSync(targetPath)) {
			endText(res, 404, "Not Found");
			return;
		}

		serveFile(res, targetPath, getMimeType(targetPath));
	};
}
