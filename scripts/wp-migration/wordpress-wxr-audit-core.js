import { resolvePermalinkAudit, extractWxrEntries } from "./wordpress-wxr-audit-parse.js";
import {
	scanHtmlTagHits,
	scanShortcodeHits,
	scanWpBlockHits,
} from "./wordpress-wxr-audit-scan.js";
import { buildAuditSummary } from "./wordpress-wxr-audit-summary.js";
import { buildCandidatePlan } from "./wordpress-wxr-candidate-plan.js";

function buildRecordBase(entry, permalinkAudit, candidatePlan) {
	return {
		legacyId: entry.legacyId,
		legacyType: entry.legacyType,
		title: entry.title,
		alias: candidatePlan.candidateAlias,
		permalinkCandidate: permalinkAudit.permalinkCandidate,
		aliasRaw: permalinkAudit.aliasRaw,
		aliasSource: permalinkAudit.aliasSource,
		permalinkPatternDetected: permalinkAudit.permalinkPatternDetected,
		permalinkTemplate: permalinkAudit.permalinkTemplate,
		sourceStatus: entry.sourceStatus,
		published: entry.published.toISOString(),
		updated: entry.updated.toISOString(),
		author: entry.author,
		categories: entry.categories,
		tags: entry.tags,
		excerpt: entry.excerpt,
		seoDescription: entry.excerpt,
		candidatePathMode: candidatePlan.candidatePathMode,
		candidateFileName: candidatePlan.candidateFileName,
		candidateTitle: candidatePlan.candidateTitle,
		candidateRelativePath: candidatePlan.candidateRelativePath,
		targetCollection: candidatePlan.targetCollection,
		permalinkSuggestedAction: permalinkAudit.suggestedAction,
	};
}

function buildEntryMetadataRecord(base) {
	return {
		...base,
		layer: "entry-metadata",
		category: "safe",
		subCategory: "",
		tagName: "",
		blockName: "",
		shortcodeName: "",
		rawSnippet: "",
		parsedAttributes: {},
		innerContent: "",
		contextBefore: "",
		contextAfter: "",
		suggestedAction: base.permalinkSuggestedAction,
		blocking: false,
	};
}

function attachEntryBase(base, hits) {
	return hits.map((hit) => ({
		...base,
		...hit,
	}));
}

export function buildAuditReport(source, options = {}) {
	const metadata = {
		contentTypes: options.contentTypes ?? ["post", "page"],
		pathMode: options.pathMode ?? "flat",
		filenameSource: options.filenameSource ?? "title",
		reportFormats: options.reportFormats ?? ["json", "md"],
		wpPermalinkTemplate: options.wpPermalinkTemplate ?? "",
		detectLinkPattern: options.detectLinkPattern ?? true,
		defaultFrontmatter: options.defaultFrontmatter ?? {},
		inputPath: options.inputPath ?? "",
		useGmtDates: options.useGmtDates === true,
		legacyIdField: options.legacyIdField ?? "legacyId",
		aliasField: options.aliasField ?? "alias",
		permalinkCandidateField:
			options.permalinkCandidateField ?? "permalinkCandidate",
		aliasRawField: options.aliasRawField ?? "aliasRaw",
	};
	const entries = extractWxrEntries(source, new Set(metadata.contentTypes), {
		useGmtDates: metadata.useGmtDates,
	}).map((entry) => {
		const permalinkAudit = resolvePermalinkAudit({
			legacyType: entry.legacyType,
			link: entry.link,
			legacyId: entry.legacyId,
			postName: entry.postName,
			sourceStatus: entry.sourceStatus,
			wpPermalinkTemplate: metadata.wpPermalinkTemplate,
			detectLinkPattern: metadata.detectLinkPattern,
		});
		const candidatePlan = buildCandidatePlan(
			entry,
			metadata.pathMode,
			permalinkAudit,
		);
		return {
			...entry,
			...permalinkAudit,
			...candidatePlan,
			alias: candidatePlan.candidateAlias,
		};
	});

	const records = [];
	for (const entry of entries) {
		const base = buildRecordBase(entry, entry, entry);
		records.push(buildEntryMetadataRecord(base));
		records.push(
			...attachEntryBase(base, scanHtmlTagHits(entry.contentHtml)),
			...attachEntryBase(base, scanWpBlockHits(entry.contentHtml)),
			...attachEntryBase(base, scanShortcodeHits(entry.contentHtml)),
		);
	}

	return {
		metadata,
		entries,
		records,
		summary: buildAuditSummary({ entries, records, metadata }),
	};
}

export { extractWxrEntries, resolvePermalinkAudit };
