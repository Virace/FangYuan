import { buildCountMap, trimString } from "./wordpress-wxr-audit-utils.js";

function renderCountSection(title, counts) {
	const lines = [`## ${title}`];
	if (counts.length === 0) {
		lines.push("- (none)");
		return lines.join("\n");
	}
	for (const [name, count] of counts) {
		lines.push(`- ${name}: ${count}`);
	}
	return lines.join("\n");
}

function renderIssuesByEntry(records) {
	const groups = new Map();
	for (const record of records) {
		if (record.layer === "entry-metadata") {
			continue;
		}
		const label = `${record.legacyId} ${record.title}`;
		if (!groups.has(label)) {
			groups.set(label, []);
		}
		groups.get(label).push(record);
	}

	const lines = ["## Issues By Entry"];
	if (groups.size === 0) {
		lines.push("- (none)");
		return lines.join("\n");
	}

	for (const [label, items] of groups.entries()) {
		lines.push(`- ${label}`);
		for (const item of items.slice(0, 5)) {
			lines.push(
				`  - ${item.layer}: ${item.category}${
					item.subCategory ? `/${item.subCategory}` : ""
				} ${item.blockName || item.shortcodeName || item.tagName || ""}`.trim(),
			);
		}
	}
	return lines.join("\n");
}

function renderPermalinkSection(records, metadata) {
	const metadataRecords = records.filter((record) => record.layer === "entry-metadata");
	const patternCounts = buildCountMap(metadataRecords, "permalinkPatternDetected");
	const unresolved = metadataRecords.filter((record) => trimString(record.aliasRaw));
	const templateErrors = metadataRecords.filter(
		(record) => record.suggestedAction === "template-parse-error",
	);
	const lines = [
		"## Permalink Stats",
		`- user template: ${metadata.wpPermalinkTemplate || "(none)"}`,
		`- detect-link-pattern: ${metadata.detectLinkPattern ? "true" : "false"}`,
	];
	lines.push(renderCountSection("Detected Patterns", patternCounts));
	lines.push("## Unresolved Raw Links");
	if (unresolved.length === 0) {
		lines.push("- (none)");
	} else {
		for (const record of unresolved) {
			lines.push(`- ${record.legacyId}: ${record.aliasRaw}`);
		}
	}
	lines.push("## Template Parse Errors");
	if (templateErrors.length === 0) {
		lines.push("- (none)");
	} else {
		for (const record of templateErrors) {
			lines.push(`- ${record.legacyId}: ${record.aliasRaw}`);
		}
	}
	return lines.join("\n");
}

function toCsvCell(value) {
	return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function buildAuditSummary({ entries, records, metadata }) {
	const issueRecords = records.filter((record) => record.layer !== "entry-metadata");
	const categoryCounts = buildCountMap(issueRecords, "category");
	const subCategoryCounts = buildCountMap(issueRecords, "subCategory");
	const markdown = [
		"# WordPress XML Audit Summary",
		"",
		"## Input Overview",
		`- content types: ${metadata.contentTypes.join(", ")}`,
		`- posts: ${entries.filter((entry) => entry.legacyType === "post").length}`,
		`- pages: ${entries.filter((entry) => entry.legacyType === "page").length}`,
		`- hit records: ${issueRecords.length}`,
		"",
		renderCountSection("Category Stats", categoryCounts),
		"",
		renderCountSection("Subcategory Stats", subCategoryCounts),
		"",
		renderIssuesByEntry(records),
		"",
		renderPermalinkSection(records, metadata),
	].join("\n");

	const csvHeader = [
		"legacyId",
		"legacyType",
		"title",
		"alias",
		"permalinkCandidate",
		"permalinkPatternDetected",
		"permalinkTemplate",
		"category",
		"subCategory",
		"blocking",
		"suggestedAction",
	];
	const csvRows = issueRecords.map((record) =>
		[
			record.legacyId,
			record.legacyType,
			record.title,
			record.alias,
			record.permalinkCandidate,
			record.permalinkPatternDetected,
			record.permalinkTemplate,
			record.category,
			record.subCategory,
			record.blocking,
			record.suggestedAction,
		]
			.map(toCsvCell)
			.join(","),
	);

	return {
		markdown,
		csv: [csvHeader.join(","), ...csvRows].join("\n"),
	};
}
