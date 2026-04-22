export function trimString(value) {
	return typeof value === "string" ? value.trim() : "";
}

export function decodePercentEncodedText(value) {
	const text = trimString(value);
	if (!text || !text.includes("%")) {
		return text;
	}

	try {
		return decodeURIComponent(text);
	} catch {
		return text;
	}
}

export function stripCdata(value) {
	const text = trimString(value);
	const match = text.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
	return match ? match[1] : text;
}

export function decodeXmlEntities(value) {
	return stripCdata(value)
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&apos;", "'")
		.replaceAll("&amp;", "&");
}

export function escapeRegex(value) {
	return String(value).replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export function parseAttributeString(source) {
	const attributes = {};
	const matcher = /([:@\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
	let match;
	while ((match = matcher.exec(source)) !== null) {
		attributes[match[1]] = match[2] ?? match[3] ?? match[4] ?? "";
	}
	return attributes;
}

export function safeParseJson(value) {
	const input = trimString(value);
	if (!input) {
		return null;
	}

	try {
		return JSON.parse(input);
	} catch {
		return null;
	}
}

export function normalizePublicPath(value) {
	const trimmed = trimString(value);
	if (!trimmed) {
		return "";
	}

	const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
	const collapsed = normalized.replace(/\/{2,}/g, "/");
	if (collapsed === "/") {
		return "/";
	}
	if (trimmed.endsWith("/")) {
		return collapsed.endsWith("/") ? collapsed : `${collapsed}/`;
	}
	return collapsed.endsWith("/") ? collapsed.slice(0, -1) : collapsed;
}

export function getContextWindow(source, index, snippetLength, radius = 48) {
	const start = Math.max(0, index - radius);
	const end = Math.min(source.length, index + snippetLength + radius);
	return {
		contextBefore: source.slice(start, index),
		contextAfter: source.slice(index + snippetLength, end),
	};
}

export function slugifyFileStem(value) {
	const collapsed = decodePercentEncodedText(value)
		.normalize("NFKC")
		.replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/[. ]+$/g, "");
	const safe = collapsed.toLowerCase();
	return safe || "untitled";
}

export function buildCountMap(records, fieldName) {
	const counts = new Map();
	for (const record of records) {
		const key = trimString(record[fieldName] ?? "") || "(none)";
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}
