import { pageMetricsConfig } from "../../config";

export function getPageMetricsClient() {
	const provider = pageMetricsConfig.enable ? pageMetricsConfig.provider ?? null : null;

	if (!provider) {
		return null;
	}

	return {
		async recordPageView(input: { postKey: string; postTitle?: string }) {
			return provider.recordPageView(input);
		},
	};
}
