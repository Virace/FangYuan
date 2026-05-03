/// <reference types="mdast" />
import { h } from "hastscript";

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

function isValidHref(value) {
	return parseExternalUrl(value) !== null || isAbsoluteSitePath(value);
}

function isExternalHref(value) {
	return parseExternalUrl(value) !== null;
}

function isValidLogo(value) {
	if (!value) {
		return true;
	}
	return parseExternalUrl(value) !== null || isAbsoluteSitePath(value);
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
 * @param {string} [properties.logo] - Optional external URL or site-absolute logo path.
 * @param {import('mdast').RootContent[]} children - The children elements of the component.
 * @returns {import('mdast').Parent} The created link card component.
 */
export function LinkCardComponent(properties, children) {
	if (Array.isArray(children) && children.length !== 0) {
		return invalidDirective("Invalid link-card directive");
	}

	const href = normalizeText(properties?.url);
	const title = normalizeText(properties?.title);
	const description = normalizeText(properties?.description);
	const logo = normalizeText(properties?.logo);

	if (!isValidHref(href)) {
		return invalidDirective("Invalid link-card url");
	}
	if (!title) {
		return invalidDirective("Invalid link-card title");
	}
	if (!description) {
		return invalidDirective("Invalid link-card description");
	}
	if (!isValidLogo(logo)) {
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
				logo,
				title,
			}),
		]),
		h("span", { class: "lc-body" }, [
			h("span", { class: "lc-title" }, title),
			h("span", { class: "lc-description" }, description),
		]),
	]);
}
