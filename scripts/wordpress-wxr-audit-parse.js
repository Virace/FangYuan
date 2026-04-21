import {
	decodePercentEncodedText,
	decodeXmlEntities,
	escapeRegex,
	normalizePublicPath,
	parseAttributeString,
	stripCdata,
	trimString,
} from "./wordpress-wxr-audit-utils.js";

function extractFirstTagValue(source, tagName) {
	const matcher = new RegExp(
		`<${escapeRegex(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRegex(tagName)}>`,
		"i",
	);
	return decodeXmlEntities(matcher.exec(source)?.[1] ?? "");
}

function extractTagValues(source, tagName) {
	const matcher = new RegExp(
		`<${escapeRegex(tagName)}(?:\\s[^>]*)?>([\\s\\S]*?)</${escapeRegex(tagName)}>`,
		"gi",
	);
	return [...source.matchAll(matcher)].map((match) => decodeXmlEntities(match[1]));
}

function extractCategoryValues(itemSource) {
	const categories = [];
	const tags = [];
	const matcher = /<category([^>]*)>([\s\S]*?)<\/category>/gi;
	let match;
	while ((match = matcher.exec(itemSource)) !== null) {
		const attributes = parseAttributeString(match[1] ?? "");
		const value = decodeXmlEntities(match[2]);
		if (!value) {
			continue;
		}
		if ((attributes.domain ?? "").toLowerCase() === "post_tag") {
			tags.push(value);
			continue;
		}
		categories.push(value);
	}
	return { categories, tags };
}

function parseWordpressDate(rawValue, { isGmt = false } = {}) {
	const normalized = rawValue.includes("T")
		? rawValue
		: rawValue.replace(" ", "T");
	const withZone =
		isGmt && !/[zZ]|[+-]\d{2}:\d{2}$/.test(normalized) ? `${normalized}Z` : normalized;
	const date = new Date(withZone);
	return Number.isNaN(date.getTime()) ? null : date;
}

function resolveDateFromCandidates(...candidates) {
	for (const candidate of candidates) {
		const rawValue = trimString(candidate.value ?? "");
		if (!rawValue || rawValue === "0000-00-00 00:00:00") {
			continue;
		}
		const date = parseWordpressDate(rawValue, { isGmt: candidate.isGmt === true });
		if (date) {
			return date;
		}
	}
	return new Date("1970-01-01T00:00:00.000Z");
}

function buildEntry(itemSource) {
	return buildEntryWithOptions(itemSource, {});
}

function buildEntryWithOptions(itemSource, options = {}) {
	const { categories, tags } = extractCategoryValues(itemSource);
	const useGmtDates = options.useGmtDates === true;
	const published = resolveDateFromCandidates(
		...(useGmtDates
			? [
					{ value: extractFirstTagValue(itemSource, "wp:post_date_gmt"), isGmt: true },
					{ value: extractFirstTagValue(itemSource, "wp:post_date"), isGmt: false },
				]
			: [
					{ value: extractFirstTagValue(itemSource, "wp:post_date"), isGmt: false },
					{ value: extractFirstTagValue(itemSource, "wp:post_date_gmt"), isGmt: true },
				]),
		{ value: extractFirstTagValue(itemSource, "pubDate"), isGmt: false },
	);
	const updated = resolveDateFromCandidates(
		...(useGmtDates
			? [
					{ value: extractFirstTagValue(itemSource, "wp:post_modified_gmt"), isGmt: true },
					{ value: extractFirstTagValue(itemSource, "wp:post_modified"), isGmt: false },
					{ value: extractFirstTagValue(itemSource, "wp:post_date_gmt"), isGmt: true },
					{ value: extractFirstTagValue(itemSource, "wp:post_date"), isGmt: false },
				]
			: [
					{ value: extractFirstTagValue(itemSource, "wp:post_modified"), isGmt: false },
					{ value: extractFirstTagValue(itemSource, "wp:post_modified_gmt"), isGmt: true },
					{ value: extractFirstTagValue(itemSource, "wp:post_date"), isGmt: false },
					{ value: extractFirstTagValue(itemSource, "wp:post_date_gmt"), isGmt: true },
				]),
		{ value: extractFirstTagValue(itemSource, "pubDate"), isGmt: false },
	);
	return {
		legacyId:
			extractFirstTagValue(itemSource, "wp:post_id") ||
			extractFirstTagValue(itemSource, "guid"),
		legacyType: extractFirstTagValue(itemSource, "wp:post_type"),
		title: extractFirstTagValue(itemSource, "title"),
		link: extractFirstTagValue(itemSource, "link"),
		postName: extractFirstTagValue(itemSource, "wp:post_name"),
		author: extractFirstTagValue(itemSource, "dc:creator"),
		sourceStatus: extractFirstTagValue(itemSource, "wp:status"),
		commentStatus: extractFirstTagValue(itemSource, "wp:comment_status"),
		postPassword: extractFirstTagValue(itemSource, "wp:post_password"),
		excerpt: extractFirstTagValue(itemSource, "excerpt:encoded"),
		contentHtml: extractFirstTagValue(itemSource, "content:encoded"),
		published,
		updated,
		categories,
		tags,
	};
}

export function extractWxrEntries(
	source,
	allowedTypes = new Set(["post", "page"]),
	options = {},
) {
	const matcher = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
	return [...source.matchAll(matcher)]
		.map((match) => buildEntryWithOptions(match[1], options))
		.filter((entry) => allowedTypes.has(entry.legacyType));
}

function buildTemplateRegex(template) {
	const tokenPatterns = {
		"%year%": "(?<year>\\d{4})",
		"%monthnum%": "(?<month>\\d{1,2})",
		"%month%": "(?<month>\\d{1,2})",
		"%day%": "(?<day>\\d{1,2})",
		"%postname%": "(?<postname>[^/]+)",
		"%slug%": "(?<slug>[^/]+)",
		"%id%": "(?<id>[^/]+)",
		"%path%": "(?<path>.+?)",
		"%type%": "(?<type>[^/]+)",
	};
	const tokenRegex = /%(?:year|monthnum|month|day|postname|slug|id|path|type)%/g;
	let pattern = "^";
	let cursor = 0;
	let match;
	while ((match = tokenRegex.exec(template)) !== null) {
		pattern += escapeRegex(template.slice(cursor, match.index));
		pattern += tokenPatterns[match[0]] ?? escapeRegex(match[0]);
		cursor = match.index + match[0].length;
	}
	pattern += escapeRegex(template.slice(cursor));
	pattern += "$";
	return new RegExp(pattern);
}

function extractLinkParts(rawLink) {
	const raw = trimString(rawLink);
	if (!raw) {
		return { raw, normalizedPath: "", hasQuery: false, hasHash: false };
	}

	try {
		const url = new URL(raw);
		return {
			raw,
			normalizedPath: normalizePublicPath(url.pathname),
			hasQuery: Boolean(url.search),
			hasHash: Boolean(url.hash),
		};
	} catch {
		return {
			raw,
			normalizedPath: normalizePublicPath(raw),
			hasQuery: raw.includes("?"),
			hasHash: raw.includes("#"),
		};
	}
}

function matchPermalinkTemplate(pathname, template) {
	if (!pathname || !template) {
		return null;
	}
	const matcher = buildTemplateRegex(template);
	const match = matcher.exec(pathname);
	return match ? { template, groups: match.groups ?? {} } : null;
}

function detectKnownPattern(pathname) {
	const patterns = [
		"/%year%/%monthnum%/%day%/%postname%/",
		"/%year%/%monthnum%/%day%/%postname%.html",
		"/%path%/%postname%/",
		"/%path%/%postname%.html",
		"/%postname%/",
		"/%postname%.html",
	];
	return patterns
		.map((pattern) => matchPermalinkTemplate(pathname, pattern))
		.find(Boolean);
}

function pickAlias({ groups, postName }) {
	const slug = decodePercentEncodedText(groups.postname || groups.slug);
	if (slug && !slug.includes(".")) {
		return { alias: slug, aliasSource: "link" };
	}
	const normalizedPostName = decodePercentEncodedText(postName);
	if (normalizedPostName && !normalizedPostName.includes(".")) {
		return { alias: normalizedPostName, aliasSource: "wp:post_name" };
	}
	return { alias: "", aliasSource: "" };
}

function buildPermalinkSuccess({ rawLink, template, groups, postName }) {
	const { alias, aliasSource } = pickAlias({ groups, postName });
	return {
		alias,
		permalinkCandidate: alias ? "" : rawLink,
		aliasRaw: "",
		aliasSource,
		permalinkPatternDetected: template,
		permalinkTemplate: template,
		suggestedAction: alias ? "auto-safe" : "manual-permalink-mapping",
	};
}

function buildPermalinkFallback(rawLink, action, template = "") {
	return {
		alias: "",
		permalinkCandidate: "",
		aliasRaw: rawLink,
		aliasSource: "",
		permalinkPatternDetected: "",
		permalinkTemplate: template,
		suggestedAction: action,
	};
}

function buildDraftDeferredPermalink(rawLink, legacyId) {
	return {
		alias: trimString(legacyId),
		permalinkCandidate: "",
		aliasRaw: rawLink,
		aliasSource: trimString(legacyId) ? "wp:post_id" : "",
		permalinkPatternDetected: "",
		permalinkTemplate: "",
		suggestedAction: "defer",
	};
}

export function resolvePermalinkAudit({
	legacyType = "post",
	link,
	legacyId = "",
	postName,
	sourceStatus = "",
	wpPermalinkTemplate = "",
	detectLinkPattern = true,
}) {
	const { raw, normalizedPath, hasQuery, hasHash } = extractLinkParts(link);
	const normalizedStatus = trimString(sourceStatus).toLowerCase();
	const normalizedPostName = decodePercentEncodedText(postName);
	const isDraft = normalizedStatus === "draft";
	const canFallbackToPostName =
		Boolean(normalizedPostName) && (legacyType === "page" || isDraft);
	if (!raw) {
		const alias = normalizedPostName;
		return {
			alias,
			permalinkCandidate: "",
			aliasRaw: "",
			aliasSource: alias ? "wp:post_name" : "",
			permalinkPatternDetected: "",
			permalinkTemplate: trimString(wpPermalinkTemplate),
			suggestedAction: alias ? "manual-permalink-mapping" : "manual-review",
		};
	}

	if (hasQuery || hasHash) {
		if (canFallbackToPostName) {
			return {
				alias: normalizedPostName,
				permalinkCandidate: "",
				aliasRaw: "",
				aliasSource: "wp:post_name",
				permalinkPatternDetected: "",
				permalinkTemplate: "",
				suggestedAction: "auto-safe",
			};
		}
		return isDraft
			? buildDraftDeferredPermalink(raw, legacyId)
			: buildPermalinkFallback(raw, "manual-permalink-mapping");
	}

	const template = trimString(wpPermalinkTemplate);
	if (template) {
		const strictMatch = matchPermalinkTemplate(normalizedPath, template);
		if (!strictMatch) {
			return buildPermalinkFallback(raw, "template-parse-error", template);
		}
		return buildPermalinkSuccess({
			rawLink: raw,
			template: strictMatch.template,
			groups: strictMatch.groups,
			postName,
		});
	}

	if (!detectLinkPattern) {
		if (canFallbackToPostName) {
			return {
				alias: normalizedPostName,
				permalinkCandidate: "",
				aliasRaw: "",
				aliasSource: "wp:post_name",
				permalinkPatternDetected: "",
				permalinkTemplate: "",
				suggestedAction: "auto-safe",
			};
		}
		return isDraft
			? buildDraftDeferredPermalink(raw, legacyId)
			: buildPermalinkFallback(raw, "manual-permalink-mapping");
	}

	const detectedMatch = detectKnownPattern(normalizedPath);
	if (!detectedMatch) {
		if (canFallbackToPostName) {
			return {
				alias: normalizedPostName,
				permalinkCandidate: "",
				aliasRaw: "",
				aliasSource: "wp:post_name",
				permalinkPatternDetected: "",
				permalinkTemplate: "",
				suggestedAction: "auto-safe",
			};
		}
		return isDraft
			? buildDraftDeferredPermalink(raw, legacyId)
			: buildPermalinkFallback(raw, "manual-permalink-mapping");
	}

	return buildPermalinkSuccess({
		rawLink: raw,
		template: detectedMatch.template,
		groups: detectedMatch.groups,
		postName,
	});
}
