/// <reference types="mdast" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { h } from "hastscript";

const localImageExtensionPattern = /\.(?:avif|gif|jpeg|jpg|png|svg|webp)$/i;

function invalidDirective(message) {
	return h(
		"div",
		{
			class: "hidden md-directive-invalid",
			"data-md-directive-error": message,
		},
		message,
	);
}

function normalizeText(value) {
	return String(value ?? "").trim();
}

function parseExternalUrl(value) {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:" ? url : null;
	} catch {
		return null;
	}
}

function isAbsoluteSitePath(value) {
	return value.startsWith("/") && !value.startsWith("//");
}

function isDataImage(value) {
	return value.startsWith("data:");
}

function isRelativePath(value) {
	return /^(?:\.\.?\/)/.test(value);
}

function normalizeSlashes(value) {
	return value.replace(/\\/g, "/");
}

function normalizeLocalPath(value) {
	return path.posix.normalize(normalizeSlashes(value));
}

function isAssetAlias(value) {
	const normalizedValue = normalizeLocalPath(value).replace(/^\/+/, "");
	return (
		normalizedValue.startsWith("assets/") &&
		localImageExtensionPattern.test(normalizedValue)
	);
}

function getVFilePath(context) {
	const filePath = context?.vfile?.path;
	if (!filePath) {
		return "";
	}

	const value = String(filePath);
	if (value.startsWith("file:")) {
		return fileURLToPath(value);
	}

	return value;
}

function isPathInside(targetPath, rootPath) {
	const relativePath = path.relative(
		path.resolve(rootPath),
		path.resolve(targetPath),
	);
	return (
		relativePath === "" ||
		(!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
	);
}

function getAliasBaseRoot(entryFilePath) {
	const siteRoot = path.resolve(process.env.FANGYUAN_SITE_ROOT ?? "site");
	if (isPathInside(entryFilePath, path.join(siteRoot, "content"))) {
		return siteRoot;
	}

	return path.join(process.cwd(), "src");
}

function makeEntryRelativePath(entryFilePath, targetPath) {
	const relativePath = normalizeSlashes(
		path.relative(path.dirname(entryFilePath), targetPath),
	);
	return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
}

function resolveLocalLogo(logo, context) {
	if (!localImageExtensionPattern.test(logo)) {
		return null;
	}

	if (isRelativePath(logo)) {
		return normalizeLocalPath(logo);
	}

	if (!isAssetAlias(logo)) {
		return null;
	}

	const entryFilePath = getVFilePath(context);
	if (!entryFilePath) {
		return null;
	}

	const normalizedAlias = normalizeLocalPath(logo).replace(/^\/+/, "");
	const targetPath = path.join(
		getAliasBaseRoot(entryFilePath),
		normalizedAlias,
	);
	return makeEntryRelativePath(entryFilePath, targetPath);
}

function registerLocalLogo(context, logo) {
	if (!context?.vfile?.data) {
		return;
	}

	context.vfile.data.astro ??= {};
	const astroData = context.vfile.data.astro;
	const localImagePaths = new Set(astroData.localImagePaths ?? []);
	localImagePaths.add(logo);
	astroData.localImagePaths = [...localImagePaths];
}

function resolveLogoSource(logo, context) {
	if (!logo) {
		return { valid: true, src: "" };
	}

	if (
		parseExternalUrl(logo) !== null ||
		isAbsoluteSitePath(logo) ||
		isDataImage(logo)
	) {
		return { valid: true, src: logo };
	}

	const localLogo = resolveLocalLogo(logo, context);
	if (!localLogo) {
		return { valid: false, src: "" };
	}

	registerLocalLogo(context, localLogo);
	return { valid: true, src: localLogo };
}

function isValidHref(value) {
	return parseExternalUrl(value) !== null || isAbsoluteSitePath(value);
}

function isExternalHref(value) {
	return parseExternalUrl(value) !== null;
}

function getFaviconFallbackUrl(href) {
	const url = parseExternalUrl(href);
	return url ? `https://favicon.im/${url.hostname}?larger=true` : "";
}

function getFallbackInitial(title) {
	return [...title][0]?.toUpperCase() ?? "L";
}

function buildLogoNode({ href, logo, title }) {
	const src = logo || getFaviconFallbackUrl(href);
	if (src) {
		return h("img", {
			class: "lc-logo",
			src,
			alt: "",
			loading: "lazy",
			decoding: "async",
			referrerpolicy: "no-referrer",
		});
	}

	return h(
		"span",
		{
			class: "lc-logo lc-logo-fallback",
			"aria-hidden": "true",
		},
		getFallbackInitial(title),
	);
}

/**
 * Creates a link card component.
 *
 * @param {Object} properties - The properties of the component.
 * @param {string} properties.url - The target URL.
 * @param {string} properties.title - The card title.
 * @param {string} properties.description - The card description.
 * @param {string} [properties.logo] - Optional external URL, site-absolute path, or local image path.
 * @param {import('mdast').RootContent[]} children - The children elements of the component.
 * @param {Object} context - rehype-components context.
 * @returns {import('mdast').Parent} The created link card component.
 */
export function LinkCardComponent(properties, children, context) {
	if (Array.isArray(children) && children.length !== 0) {
		return invalidDirective("Invalid link-card directive");
	}

	const href = normalizeText(properties?.url);
	const title = normalizeText(properties?.title);
	const description = normalizeText(properties?.description);
	const logo = normalizeText(properties?.logo);
	const logoSource = resolveLogoSource(logo, context);

	if (!isValidHref(href)) {
		return invalidDirective("Invalid link-card url");
	}
	if (!title) {
		return invalidDirective("Invalid link-card title");
	}
	if (!description) {
		return invalidDirective("Invalid link-card description");
	}
	if (!logoSource.valid) {
		return invalidDirective("Invalid link-card logo");
	}

	const linkProperties = {
		class: "card-link no-styling",
		href,
	};

	if (isExternalHref(href)) {
		linkProperties.target = "_blank";
		linkProperties.rel = "noopener noreferrer";
	}

	return h("a", linkProperties, [
		h("span", { class: "lc-media" }, [
			buildLogoNode({
				href,
				logo: logoSource.src,
				title,
			}),
		]),
		h("span", { class: "lc-body" }, [
			h("span", { class: "lc-title" }, title),
			h("span", { class: "lc-description" }, description),
		]),
	]);
}
