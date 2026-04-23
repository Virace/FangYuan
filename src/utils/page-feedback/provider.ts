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
