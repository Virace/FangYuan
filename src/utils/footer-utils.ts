import { footerConfig } from "../config";
import { resolveConfigAssetUrl } from "./image-source";

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const POLICE_RECORD_CODE_PATTERN = /\d+/g;

function normalizeFooterValue(value?: string | null): string {
	return value?.trim() ?? "";
}

export function getFooterCustomHtml(): string {
	return normalizeFooterValue(footerConfig.customHtml);
}

export async function getResolvedFooterCustomHtml(): Promise<string> {
	const customHtml = getFooterCustomHtml();
	const attributePattern =
		/(?<name>\s(?:src|href)=["'])(?<value>assets\/[^"']+)(?<quote>["'])/gi;
	const matches = [...customHtml.matchAll(attributePattern)];
	if (matches.length === 0) {
		return customHtml;
	}

	const replacements = await Promise.all(
		matches.map(async (match) => ({
			raw: match[0],
			resolved: `${match.groups?.name ?? ""}${
				(await resolveConfigAssetUrl(match.groups?.value, "site")) ??
				match.groups?.value ??
				""
			}${match.groups?.quote ?? ""}`,
		})),
	);

	let resolvedHtml = customHtml;
	for (const { raw, resolved } of replacements) {
		resolvedHtml = resolvedHtml.replace(raw, resolved);
	}

	return resolvedHtml;
}

export function footerCustomHtmlLooksLikeMarkup(): boolean {
	const customHtml = getFooterCustomHtml();

	return customHtml !== "" && HTML_TAG_PATTERN.test(customHtml);
}

export function getFooterIcpRecord(): string {
	return normalizeFooterValue(footerConfig.icp);
}

export function getFooterIcpUrl(): string {
	return "https://beian.miit.gov.cn/";
}

export function getFooterPoliceRecord(): string {
	return normalizeFooterValue(footerConfig.policeRecord);
}

export function getFooterPoliceRecordCode(): string {
	const record = getFooterPoliceRecord();
	const numericParts = record.match(POLICE_RECORD_CODE_PATTERN) ?? [];

	return numericParts.join("");
}

export function getFooterPoliceRecordUrl(): string | undefined {
	const code = getFooterPoliceRecordCode();

	if (code === "") {
		return undefined;
	}

	return `https://beian.mps.gov.cn/#/query/webSearch?code=${code}`;
}
