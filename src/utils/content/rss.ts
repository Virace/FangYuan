import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const parser = new MarkdownIt({ html: true });

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: XML invalid ranges
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function normalizeFoldIcon(rawIcon: string | undefined): string {
	const icon = String(rawIcon ?? "")
		.trim()
		.toLowerCase();

	const aliases: Record<string, string> = {
		"": "file",
		default: "file",
		document: "file",
		info: "note",
		help: "question",
		star: "sparkles",
		lightbulb: "tip",
		hidden: "none",
		false: "none",
	};

	const normalized = aliases[icon] ?? icon;

	return [
		"file",
		"note",
		"tip",
		"warning",
		"question",
		"bookmark",
		"sparkles",
		"none",
	].includes(normalized)
		? normalized
		: "file";
}

function isTruthyAttribute(rawValue: string | undefined): boolean {
	if (rawValue == null) {
		return false;
	}

	const normalized = String(rawValue ?? "")
		.trim()
		.toLowerCase();
	return ["", "true", "1", "yes", "on", "open"].includes(normalized);
}

function parseDirectiveAttributes(
	rawAttributes: string,
): Record<string, string> {
	const attributes: Record<string, string> = {};

	for (const match of rawAttributes.matchAll(
		/([A-Za-z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))/g,
	)) {
		const [, key, doubleQuoted, singleQuoted, unquoted] = match;
		attributes[key] = doubleQuoted ?? singleQuoted ?? unquoted ?? "";
	}

	return attributes;
}

function convertInlineHighlights(markdown: string): string {
	return markdown.replace(
		/:hl\[([\s\S]*?)\]\{tone="(note|tip|important|warning|caution)"\}/g,
		(_match, content, tone) =>
			`<mark class="md-highlight tone-${tone}" data-tone="${tone}">${content}</mark>`,
	);
}

function renderFeedFragment(markdown: string): string {
	return parser.render(normalizeDirectiveMarkdown(markdown)).trim();
}

function convertAsideBlocks(markdown: string): string {
	return markdown.replace(
		/(^|\n):{3,}aside\s*\n([\s\S]*?)\n:{3,}(?=\n|$)/g,
		(_match, prefix, body) =>
			`${prefix}<aside class="md-aside">\n${renderFeedFragment(body)}\n</aside>`,
	);
}

function convertFoldBlocks(markdown: string): string {
	return markdown.replace(
		/(^|\n):{3,}fold\{([^}]*)\}\s*\n([\s\S]*?)\n:{3,}(?=\n|$)/g,
		(_match, prefix, rawAttributes, body) => {
			const attributes = parseDirectiveAttributes(rawAttributes);
			const title = escapeHtml(attributes.title || "Details");
			const icon = normalizeFoldIcon(attributes.icon);
			const openAttr = isTruthyAttribute(attributes.open) ? " open" : "";

			return `${prefix}<details class="md-fold" data-icon="${icon}"${openAttr}><summary class="md-fold-summary">${title}</summary><div class="md-fold-body">\n${renderFeedFragment(body)}\n</div></details>`;
		},
	);
}

function normalizeDirectiveMarkdown(markdown: string): string {
	return convertFoldBlocks(
		convertAsideBlocks(convertInlineHighlights(markdown)),
	);
}

export function renderFeedHtml(markdown: string): string {
	return sanitizeHtml(
		renderFeedFragment(stripInvalidXmlChars(String(markdown ?? ""))),
		{
			allowedTags: sanitizeHtml.defaults.allowedTags.concat([
				"img",
				"mark",
				"aside",
				"details",
				"summary",
				"div",
			]),
			allowedAttributes: {
				"*": ["class", "data-tone", "data-icon"],
				a: ["href", "name", "target", "rel"],
				details: ["open"],
				img: ["src", "alt", "title"],
			},
		},
	);
}
