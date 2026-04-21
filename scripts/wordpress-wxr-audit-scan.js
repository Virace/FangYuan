import {
	getContextWindow,
	parseAttributeString,
	safeParseJson,
	trimString,
} from "./wordpress-wxr-audit-utils.js";

const SAFE_TAGS = new Set([
	"p",
	"ul",
	"ol",
	"li",
	"blockquote",
	"pre",
	"code",
	"a",
	"strong",
	"em",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"figure",
	"figcaption",
	"br",
	"hr",
	"s",
	"cite",
]);

const DEGRADEABLE_TAGS = new Set([
	"div",
	"span",
	"img",
	"table",
	"thead",
	"tbody",
	"tr",
	"td",
	"th",
	"video",
	"iframe",
]);

const CODE_LIKE_BLOCK_NAMES = new Set([
	"code",
	"verse",
	"preformatted",
	"enlighter/codeblock",
]);

const COLOR_TONE_RULES = [
	{
		tone: "note",
		tokens: [
			"has-vivid-cyan-blue-color",
			"has-pale-cyan-blue-color",
			"style=\"color: #3366ff",
			"style=\"color: #0000ff",
			"style=\"color: #00ccff",
			"style=\"color:#0a5ce9",
			"style=\"color: #008080",
		],
	},
	{
		tone: "tip",
		tokens: [
			"has-vivid-green-cyan-color",
			"has-light-green-cyan-color",
			"has-light-green-cyan-background-color",
			"style=\"color: #339966",
			"style=\"color: #008000",
			"style=\"color:#00d084",
		],
	},
	{
		tone: "important",
		tokens: [
			"has-vivid-purple-color",
			"has-pale-pink-color",
			"style=\"color: #ff00ff",
		],
	},
	{
		tone: "warning",
		tokens: [
			"has-luminous-vivid-amber-color",
			"has-luminous-vivid-orange-color",
			"has-luminous-vivid-amber-background-color",
			"style=\"color: #ff6600",
			"style=\"color: #ff9900",
			"style=\"color: #ffcc00",
		],
	},
	{
		tone: "caution",
		tokens: [
			"has-vivid-red-color",
			"style=\"color: #ff0000",
			"style=\"color: #800000",
		],
	},
];

function createSafeSemanticResult({ semanticTarget = "", semanticTone = "" } = {}) {
	return {
		category: "safe",
		subCategory: "",
		suggestedAction: "auto-safe",
		blocking: false,
		semanticTarget,
		semanticTone,
	};
}

function resolveSemanticTone(tagName, attributes, rawSnippet) {
	const className = trimString(attributes.class ?? "").toLowerCase();
	const style = trimString(attributes.style ?? "").toLowerCase();
	const snippet = trimString(rawSnippet).toLowerCase();

	if (
		tagName === "p" &&
		className.includes("has-cyan-bluish-gray-color") &&
		(className.includes("has-small-font-size") ||
			className.includes("has-medium-font-size"))
	) {
		return {
			...createSafeSemanticResult({
				semanticTarget: "aside",
				semanticTone: "aside",
			}),
		};
	}

	if (
		snippet.includes("style=\"color: #ccffff") ||
		className.includes("has-white-color")
	) {
		return {
			...createSafeSemanticResult({
				semanticTarget: "plain-text",
			}),
		};
	}

	for (const rule of COLOR_TONE_RULES) {
		if (rule.tokens.some((token) => snippet.includes(token.toLowerCase()))) {
			const semanticTarget =
				tagName === "p" &&
				(className.includes("has-background") || style.includes("background-color"))
					? "admonition"
					: "inline-highlight";
			return {
				...createSafeSemanticResult({
					semanticTarget,
					semanticTone: rule.tone,
				}),
			};
		}
	}

	return null;
}

function classifyApprovedBackgroundSemantic(tagName, attributes) {
	const className = trimString(attributes.class ?? "");
	if (!["p", "mark"].includes(tagName)) {
		return null;
	}
	if (
		/has-very-light-gray-background-color|has-cyan-bluish-gray-background-color/i.test(
			className,
		)
	) {
		return createSafeSemanticResult({
			semanticTarget: "blockquote",
		});
	}
	if (/has-pale-cyan-blue-background-color/i.test(className)) {
		return createSafeSemanticResult({
			semanticTarget: "admonition",
			semanticTone: "tip",
		});
	}
	return null;
}

function maskIgnoredContent(source) {
	return source.replace(
		/<!--\s*wp:(code|verse|preformatted|enlighter\/codeblock)(?:\s+{[\s\S]*?})?\s*-->[\s\S]*?<!--\s*\/wp:\1\s*-->/gi,
		(match) => " ".repeat(match.length),
	);
}

function classifyThemeAttributes(attributes, rawSnippet) {
	const className = trimString(attributes.class ?? "");
	const style = trimString(attributes.style ?? "");
	const haystack = `${className} ${style} ${rawSnippet}`;
	if (/background|has-background|-background-color/i.test(haystack)) {
		return "background-color";
	}
	if (/(^|\s)has-[\w-]+-color|color:/i.test(haystack)) {
		return "text-color";
	}
	if (/align|text-align/i.test(haystack)) {
		return "alignment";
	}
	if (/layout|column|group|container|grid/i.test(haystack)) {
		return "layout-container";
	}
	if (/accordion|toggle|tabs|modal|dialog|data-/i.test(haystack)) {
		return "interactive-container";
	}
	return "";
}

function buildLayerHit(source, match, fields) {
	const rawSnippet = match[0];
	return {
		rawSnippet,
		contextBefore: getContextWindow(source, match.index, rawSnippet.length).contextBefore,
		contextAfter: getContextWindow(source, match.index, rawSnippet.length).contextAfter,
		...fields,
	};
}

export function scanHtmlTagHits(source) {
	const matcher = /<([a-z][a-z0-9:-]*)(\s[^<>]*?)?>/gi;
	const sanitizedSource = maskIgnoredContent(source);
	const hits = [];
	let match;
	while ((match = matcher.exec(sanitizedSource)) !== null) {
		const tagName = (match[1] ?? "").toLowerCase();
		const attributes = parseAttributeString(match[2] ?? "");
		const semanticToneResult = resolveSemanticTone(tagName, attributes, match[0]);
		if (semanticToneResult) {
			hits.push(
				buildLayerHit(sanitizedSource, match, {
					layer: "html-tag",
					tagName,
					blockName: "",
					shortcodeName: "",
					parsedAttributes: attributes,
					innerContent: "",
					...semanticToneResult,
				}),
			);
			continue;
		}
		const approvedBackgroundSemantic = classifyApprovedBackgroundSemantic(
			tagName,
			attributes,
		);
		if (approvedBackgroundSemantic) {
			hits.push(
				buildLayerHit(sanitizedSource, match, {
					layer: "html-tag",
					tagName,
					blockName: "",
					shortcodeName: "",
					parsedAttributes: attributes,
					innerContent: "",
					...approvedBackgroundSemantic,
				}),
			);
			continue;
		}
		const themeSubCategory = classifyThemeAttributes(attributes, match[0]);
		if (themeSubCategory) {
			hits.push(
				buildLayerHit(sanitizedSource, match, {
					layer: "html-tag",
					category: "theme-sensitive",
					subCategory: themeSubCategory,
					tagName,
					blockName: "",
					shortcodeName: "",
					parsedAttributes: attributes,
					innerContent: "",
					suggestedAction: "manual-theme-mapping",
					blocking: true,
				}),
			);
			continue;
		}
		if (SAFE_TAGS.has(tagName)) {
			hits.push(
				buildLayerHit(sanitizedSource, match, {
					layer: "html-tag",
					category: "safe",
					subCategory: "",
					tagName,
					blockName: "",
					shortcodeName: "",
					parsedAttributes: attributes,
					innerContent: "",
					suggestedAction: "auto-safe",
					blocking: false,
				}),
			);
			continue;
		}
		const category = DEGRADEABLE_TAGS.has(tagName) ? "degradeable" : "unsupported";
		hits.push(
			buildLayerHit(sanitizedSource, match, {
				layer: "html-tag",
				category,
				subCategory: "",
				tagName,
				blockName: "",
				shortcodeName: "",
				parsedAttributes: attributes,
				innerContent: "",
				suggestedAction: category === "degradeable" ? "auto-degrade" : "manual-review",
				blocking: category !== "degradeable",
			}),
		);
	}
	return hits;
}

function classifyBlock(blockName, attributes, rawSnippet) {
	if (CODE_LIKE_BLOCK_NAMES.has(blockName)) {
		return {
			category: "safe",
			subCategory: "",
			suggestedAction: "auto-safe",
			blocking: false,
		};
	}
	if (["separator", "pullquote", "shortcode"].includes(blockName)) {
		return {
			category: "safe",
			subCategory: "",
			suggestedAction: "auto-safe",
			blocking: false,
		};
	}
	if (
		blockName === "paragraph" &&
		["pale-cyan-blue"].includes(trimString(attributes.backgroundColor ?? ""))
	) {
		return createSafeSemanticResult({
			semanticTarget: "admonition",
			semanticTone: "tip",
		});
	}
	if (attributes.align || /align|text-align/i.test(rawSnippet)) {
		return {
			category: "theme-sensitive",
			subCategory: "alignment",
			suggestedAction: "manual-theme-mapping",
			blocking: true,
		};
	}
	if (/columns|column|group|cover|media-text|buttons|button|spacer/i.test(blockName)) {
		return {
			category: "theme-sensitive",
			subCategory: "layout-container",
			suggestedAction: "manual-theme-mapping",
			blocking: true,
		};
	}
	if (
		![
			"paragraph",
			"heading",
			"list",
			"quote",
			"image",
			"table",
			"html",
			"gallery",
		].includes(blockName)
	) {
		return {
			category: "unsupported",
			subCategory: "",
			suggestedAction: "rule-candidate",
			blocking: true,
		};
	}
	if (["image", "table", "html", "gallery"].includes(blockName)) {
		return {
			category: "degradeable",
			subCategory: "",
			suggestedAction: "auto-degrade",
			blocking: false,
		};
	}
	return {
		category: "safe",
		subCategory: "",
		suggestedAction: "auto-safe",
		blocking: false,
	};
}

function collectBlockHits(source, matcher, isSelfClosing = false) {
	const hits = [];
	let match;
	while ((match = matcher.exec(source)) !== null) {
		const blockName = trimString(match[1]).replace(/^core\//, "");
		const parsedAttributes = safeParseJson(match[2] ?? "") ?? {};
		const innerContent = isSelfClosing ? "" : trimString(match[3] ?? "");
		const classification = classifyBlock(blockName, parsedAttributes, match[0]);
		hits.push(
			buildLayerHit(source, match, {
				layer: "wp-block",
				tagName: "",
				blockName,
				shortcodeName: "",
				parsedAttributes,
				innerContent,
				...classification,
			}),
		);
	}
	return hits;
}

export function scanWpBlockHits(source) {
	const pairedMatcher =
		/<!--\s*wp:([^\s]+)(?:\s+({[\s\S]*?}))?\s*-->([\s\S]*?)<!--\s*\/wp:\1\s*-->/gi;
	const selfClosingMatcher =
		/<!--\s*wp:([^\s]+)(?:\s+({[\s\S]*?}))?\s*\/-->/gi;
	return [
		...collectBlockHits(source, pairedMatcher, false),
		...collectBlockHits(source, selfClosingMatcher, true),
	];
}

function parseShortcodeAttributes(source) {
	const attributes = {};
	const matcher = /([:@\w-]+)\s*=\s*"([^"]*)"/g;
	let match;
	while ((match = matcher.exec(source)) !== null) {
		attributes[match[1]] = match[2];
	}
	return attributes;
}

export function scanShortcodeHits(source) {
	const pairedMatcher = /\[([a-z][\w-]*)([^\]]*)\]([\s\S]*?)\[\/\1\]/gi;
	const selfClosingMatcher = /\[([a-z][\w-]*)([^\]]*?)\/\]/gi;
	const sanitizedSource = maskIgnoredContent(source);
	const hits = [];
	let match;
	while ((match = pairedMatcher.exec(sanitizedSource)) !== null) {
		const shortcodeName = trimString(match[1]);
		const parsedAttributes = parseShortcodeAttributes(match[2] ?? "");
		const innerContent = trimString(match[3] ?? "");
		let category = "unsupported";
		let subCategory = "shortcode-paired";
		let suggestedAction = "rule-candidate";
		let blocking = true;
		if (shortcodeName === "bilibili" || shortcodeName === "cr_alert") {
			category = "safe";
			subCategory = "";
			suggestedAction = "auto-safe";
			blocking = false;
		} else if (shortcodeName === "music") {
			category = "degradeable";
			subCategory = "";
			suggestedAction = "auto-degrade";
			blocking = false;
		}
		hits.push(
			buildLayerHit(sanitizedSource, match, {
				layer: "shortcode",
				category,
				subCategory,
				tagName: "",
				blockName: "",
				shortcodeName,
				parsedAttributes,
				innerContent,
				suggestedAction,
				blocking,
			}),
		);
	}
	while ((match = selfClosingMatcher.exec(sanitizedSource)) !== null) {
		const shortcodeName = trimString(match[1]);
		const parsedAttributes = parseShortcodeAttributes(match[2] ?? "");
		let category = "unsupported";
		let subCategory = "shortcode-self-closing";
		let suggestedAction = "rule-candidate";
		let blocking = true;
		if (shortcodeName === "bilibili" || shortcodeName === "cr_alert") {
			category = "safe";
			subCategory = "";
			suggestedAction = "auto-safe";
			blocking = false;
		} else if (shortcodeName === "music") {
			category = "degradeable";
			subCategory = "";
			suggestedAction = "auto-degrade";
			blocking = false;
		}
		hits.push(
			buildLayerHit(sanitizedSource, match, {
				layer: "shortcode",
				category,
				subCategory,
				tagName: "",
				blockName: "",
				shortcodeName,
				parsedAttributes,
				innerContent: "",
				suggestedAction,
				blocking,
			}),
		);
	}
	return hits;
}
