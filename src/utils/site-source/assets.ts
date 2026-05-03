export const externalSiteAssetDevPrefix = "/__fangyuan-site-assets/";

export function getExternalSiteAssetDevUrl(reference: string): string {
	const normalizedReference = reference.replace(/\\/g, "/").replace(/^\/+/, "");
	const encodedReference = normalizedReference
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");

	return `${externalSiteAssetDevPrefix}${encodedReference}`;
}
