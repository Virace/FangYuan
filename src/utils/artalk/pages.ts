import { DEFAULT_COMMENT_SORT_BY } from "../comments/options";
import type { PageFeedbackState } from "../page-feedback/provider";
import type { PageMetrics } from "../page-metrics/provider";
import { type ArtalkVoteResponse, createArtalkCommentsApi } from "./comments";
import {
	type ArtalkApiConfig,
	fetchArtalkJson,
	normalizeArtalkApiConfig,
} from "./core";
import {
	getArtalkPageSnapshot,
	getArtalkPageSnapshotLoad,
	mapArtalkPageSnapshot,
	patchArtalkPageSnapshot,
	setArtalkPageSnapshot,
	waitForArtalkPageSnapshot,
} from "./page-snapshot";

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

		getPageVote(targetId: string) {
			return fetchArtalkJson<ArtalkVoteResponse>(
				normalizedConfig,
				`/api/v2/votes/page/${targetId}/`,
			);
		},

		votePage(targetId: string) {
			return fetchArtalkJson<ArtalkVoteResponse>(
				normalizedConfig,
				`/api/v2/votes/page/${targetId}/up/`,
				{
					init: {
						method: "POST",
						body: JSON.stringify({}),
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

export type ArtalkPageFeedbackServiceConfig = ArtalkApiConfig;

async function resolveArtalkPageSnapshot(
	postKey: string,
	normalizedConfig: ArtalkApiConfig,
) {
	const cachedSnapshot = getArtalkPageSnapshot(postKey);
	if (cachedSnapshot) {
		return cachedSnapshot;
	}

	const waitedSnapshot = await waitForArtalkPageSnapshot(postKey, 600);
	if (waitedSnapshot) {
		return waitedSnapshot;
	}

	const pendingSnapshot = getArtalkPageSnapshotLoad(postKey);
	if (pendingSnapshot) {
		const awaitedSnapshot = await pendingSnapshot;
		if (awaitedSnapshot) {
			return awaitedSnapshot;
		}
	}

	const commentsApi = createArtalkCommentsApi(normalizedConfig);
	const response = await commentsApi.listComments({
		postKey,
		sortBy: DEFAULT_COMMENT_SORT_BY,
		limit: 1,
		offset: 0,
	});

	if (!response.page) {
		throw new Error(`Artalk page snapshot missing for ${postKey}`);
	}

	return setArtalkPageSnapshot(postKey, mapArtalkPageSnapshot(response.page));
}

export function createArtalkPageFeedbackService(
	config: ArtalkPageFeedbackServiceConfig,
) {
	const normalizedConfig = normalizeArtalkApiConfig(config);
	const artalkPagesApi = createArtalkPagesApi(normalizedConfig);

	return {
		async getState(input: {
			postKey: string;
			postTitle?: string;
		}): Promise<PageFeedbackState> {
			const snapshot = await resolveArtalkPageSnapshot(
				input.postKey,
				normalizedConfig,
			);
			const vote = await artalkPagesApi.getPageVote(String(snapshot.id));

			return {
				likeCount: snapshot.voteUp,
				liked: vote.is_up,
			};
		},

		async likePage(input: {
			postKey: string;
			postTitle?: string;
		}): Promise<PageFeedbackState> {
			const snapshot = await resolveArtalkPageSnapshot(
				input.postKey,
				normalizedConfig,
			);
			const vote = await artalkPagesApi.votePage(String(snapshot.id));

			patchArtalkPageSnapshot(input.postKey, {
				voteUp: vote.up,
				voteDown: vote.down,
			});

			return {
				likeCount: vote.up,
				liked: true,
			};
		},
	};
}
