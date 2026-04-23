import { footerConfig } from "../config";

const HTML_TAG_PATTERN = /<\/?[a-z][\s\S]*>/i;
const POLICE_RECORD_CODE_PATTERN = /\d+/g;

function normalizeFooterValue(value?: string | null): string {
	return value?.trim() ?? "";
}

export function getFooterCustomHtml(): string {
	return normalizeFooterValue(footerConfig.customHtml);
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
