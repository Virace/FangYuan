import { slugifyFileStem, trimString } from "./wordpress-wxr-audit-utils.js";

function isDraft(entry) {
	return trimString(entry.sourceStatus).toLowerCase() === "draft";
}

function isPureNumericAlias(value) {
	return /^\d+$/.test(trimString(value));
}

function resolveCandidateAlias(entry, permalinkAudit) {
	const alias = trimString(permalinkAudit.alias);
	if (!isPureNumericAlias(alias)) {
		return alias;
	}
	if (isDraft(entry) && permalinkAudit.aliasSource === "wp:post_id") {
		return `draft-${alias}`;
	}
	return alias;
}

export function buildCandidatePlan(entry, pathMode, permalinkAudit) {
	const targetCollection = entry.legacyType === "page" ? "spec" : "posts";
	const candidateAlias = resolveCandidateAlias(entry, permalinkAudit);
	const candidateBase =
		candidateAlias ||
		trimString(entry.postName) ||
		trimString(entry.title) ||
		trimString(entry.legacyId);
	const candidateFileName = slugifyFileStem(candidateBase);
	const candidateTitle =
		isDraft(entry) &&
		permalinkAudit.aliasSource === "wp:post_id" &&
		trimString(entry.title)
			? `${trimString(entry.title)}-草稿`
			: entry.title;
	if (pathMode === "date-tree" && targetCollection === "posts") {
		const year = String(entry.published.getUTCFullYear());
		const month = String(entry.published.getUTCMonth() + 1).padStart(2, "0");
		const day = String(entry.published.getUTCDate()).padStart(2, "0");
		return {
			targetCollection,
			candidateAlias,
			candidateFileName,
			candidateTitle,
			candidatePathMode: pathMode,
			candidateRelativePath: `${targetCollection}/${year}/${month}/${day}/${candidateFileName}.md`,
		};
	}

	return {
		targetCollection,
		candidateAlias,
		candidateFileName,
		candidateTitle,
		candidatePathMode: pathMode,
		candidateRelativePath: `${targetCollection}/${candidateFileName}.md`,
	};
}
