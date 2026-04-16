export type RewardOption = {
	id: string;
	name: string;
	image: string;
	alt?: string;
};

export type PageFeedbackCapability = {
	supportsLike: boolean;
};

export type PageFeedbackState = {
	likeCount: number;
	liked: boolean;
};

export type GetPageFeedbackInput = {
	postKey: string;
	postTitle?: string;
};

export type LikePageInput = {
	postKey: string;
	postTitle?: string;
};

export abstract class PageFeedbackProvider {
	abstract readonly kind: string;

	abstract getCapability(
		input: GetPageFeedbackInput,
	): Promise<PageFeedbackCapability>;
	abstract getState(input: GetPageFeedbackInput): Promise<PageFeedbackState>;
	abstract likePage(input: LikePageInput): Promise<PageFeedbackState>;
}

export function getPageFeedbackProvider(config: {
	enable: boolean;
	provider?: PageFeedbackProvider | null;
}): PageFeedbackProvider | null {
	if (!config.enable) {
		return null;
	}

	return config.provider ?? null;
}
