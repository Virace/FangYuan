import type {
	AliasValidationMode,
	PostPatternRule,
	TrailingSlashStrategy,
} from "../types/config";
import { applyTrailingSlash } from "./permalink-materialization.ts";

type PermalinkRenderInput = {
	slug: string;
	path: string;
	year: string;
	month: string;
	day: string;
	id: string;
	type: "posts" | "spec";
};

type ResolvePermalinkInput = {
	entryType: "post" | "spec";
	entryId: string;
	fileStem: string;
	alias?: string;
	permalink?: string;
	pattern: string;
	postPatternRules?: PostPatternRule[];
	published: Date;
	aliasValidation?: AliasValidationMode;
	trailingSlash?: TrailingSlashStrategy;
};

function normalizeAliasOrThrow(
	alias: string,
	mode: AliasValidationMode,
): string {
	const normalizedAlias = alias.trim();
	if (!normalizedAlias.includes(".")) {
		return normalizedAlias;
	}

	if (mode === "normalize") {
		return normalizedAlias.replace(/\.+/g, "-");
	}

	throw new Error(`alias "${normalizedAlias}" must not contain "."`);
}

function normalizeInternalPath(value: string): string {
	const trimmedValue = value.trim();
	if (trimmedValue === "") {
		return "/";
	}

	const ensuredLeadingSlash = trimmedValue.startsWith("/")
		? trimmedValue
		: `/${trimmedValue}`;

	return ensuredLeadingSlash.replace(/\/{2,}/g, "/");
}

function normalizeEntryId(value: string): string {
	return value
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "");
}

function buildPathToken(entryId: string): string {
	const normalizedEntryId = normalizeEntryId(entryId);
	if (!normalizedEntryId.includes("/")) {
		return "";
	}

	const segments = normalizedEntryId.split("/");
	segments.pop();
	return segments.join("/");
}

function matchesSegment(pattern: string, value: string): boolean {
	const escapedPattern = pattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
	const segmentRegex = new RegExp(
		`^${escapedPattern.replaceAll("*", "[^/]*")}$`,
	);
	return segmentRegex.test(value);
}

function matchesPathPattern(pattern: string, value: string): boolean {
	const patternSegments = normalizeEntryId(pattern).split("/").filter(Boolean);
	const valueSegments = normalizeEntryId(value).split("/").filter(Boolean);

	const matchFrom = (patternIndex: number, valueIndex: number): boolean => {
		if (patternIndex >= patternSegments.length) {
			return valueIndex >= valueSegments.length;
		}

		const segment = patternSegments[patternIndex];
		if (segment === "**") {
			if (patternIndex === patternSegments.length - 1) {
				return true;
			}

			for (
				let nextValueIndex = valueIndex;
				nextValueIndex <= valueSegments.length;
				nextValueIndex += 1
			) {
				if (matchFrom(patternIndex + 1, nextValueIndex)) {
					return true;
				}
			}

			return false;
		}

		if (valueIndex >= valueSegments.length) {
			return false;
		}

		if (!matchesSegment(segment, valueSegments[valueIndex])) {
			return false;
		}

		return matchFrom(patternIndex + 1, valueIndex + 1);
	};

	return matchFrom(0, 0);
}

function resolvePostPattern(
	entryId: string,
	defaultPattern: string,
	postPatternRules: PostPatternRule[],
): string {
	const normalizedEntryId = normalizeEntryId(entryId);
	const matchedRule = postPatternRules.find((rule) =>
		matchesPathPattern(rule.match, normalizedEntryId),
	);

	return matchedRule?.pattern ?? defaultPattern;
}

export function buildPublicSlug({
	alias,
	fileStem,
	aliasValidation,
}: {
	alias: string;
	fileStem: string;
	aliasValidation: AliasValidationMode;
}): string {
	const candidate = alias.trim() || fileStem.trim();
	return normalizeAliasOrThrow(candidate, aliasValidation);
}

export function compilePattern(template: string) {
	return ({
		slug,
		path,
		year,
		month,
		day,
		id,
		type,
	}: PermalinkRenderInput): string =>
		normalizeInternalPath(
			template
				.replaceAll("%slug%", slug)
				.replaceAll("%postname%", slug)
				.replaceAll("%path%", path)
				.replaceAll("%year%", year)
				.replaceAll("%month%", month)
				.replaceAll("%monthnum%", month)
				.replaceAll("%day%", day)
				.replaceAll("%id%", id)
				.replaceAll("%type%", type),
		);
}

export function resolvePermalinkForEntry(input: ResolvePermalinkInput): string {
	const trailingSlash = input.trailingSlash ?? "auto";
	if (input.permalink?.trim()) {
		return applyTrailingSlash(
			normalizeInternalPath(input.permalink),
			trailingSlash,
		);
	}

	const slug = buildPublicSlug({
		alias: input.alias ?? "",
		fileStem: input.fileStem,
		aliasValidation: input.aliasValidation ?? "error",
	});
	const pattern =
		input.entryType === "post"
			? resolvePostPattern(
					input.entryId,
					input.pattern,
					input.postPatternRules ?? [],
				)
			: input.pattern;
	const render = compilePattern(pattern);
	const publicPath = render({
		slug,
		path: buildPathToken(input.entryId),
		year: String(input.published.getFullYear()),
		month: String(input.published.getMonth() + 1).padStart(2, "0"),
		day: String(input.published.getDate()).padStart(2, "0"),
		id: normalizeEntryId(input.entryId),
		type: input.entryType === "post" ? "posts" : "spec",
	});

	return applyTrailingSlash(publicPath, trailingSlash);
}
