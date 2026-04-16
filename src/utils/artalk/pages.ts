import type { PageMetrics } from "../page-metrics/provider";
import {
	type ArtalkApiConfig,
	fetchArtalkJson,
	normalizeArtalkApiConfig,
} from "./core";

export type ArtalkPageMetricsResponse = {
	pv: number;
};

export function createArtalkPagesApi(config: ArtalkApiConfig) {
	const normalizedConfig = normalizeArtalkApiConfig(config);

	return {
		recordPageView(input: { postKey: string; postTitle?: string }) {
			return fetchArtalkJson<ArtalkPageMetricsResponse>(
				normalizedConfig,
				"/api/v2/pages/pv/",
				{
					init: {
						method: "POST",
						body: JSON.stringify({
							page_key: input.postKey,
							page_title: input.postTitle ?? undefined,
							site_name: normalizedConfig.siteName,
						}),
					},
				},
			);
		},
	};
}

export function createArtalkPageMetricsService(config: ArtalkApiConfig) {
	const artalkPagesApi = createArtalkPagesApi(config);

	return {
		async recordPageView(input: {
			postKey: string;
			postTitle?: string;
		}): Promise<PageMetrics> {
			const metrics = await artalkPagesApi.recordPageView(input);
			return {
				pv: metrics.pv,
			};
		},
	};
}
