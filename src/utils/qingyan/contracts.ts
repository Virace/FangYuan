import type {
	CommentCapability,
	CommentCaptchaState,
	CommentForm,
	CommentSortBy,
} from "@utils/comments/provider";
import type {
	CanonicalComment,
	CommentStatus,
	CommentVoteChoice,
} from "@/types/comment";

export type QingYanClientConfig = {
	siteKey: string;
	apiBase?: string;
};

export type QingYanBootstrapInput = {
	pageKey: string;
	pageTitle?: string;
	pageUrl?: string;
	sortBy?: CommentSortBy;
	limit?: number;
	offset?: number;
};

export type QingYanThreadInput = QingYanBootstrapInput;

export type QingYanPageFeedbackState = {
	supportsLike: boolean;
	likeCount: number;
	liked: boolean;
};

export type QingYanPageMetrics = {
	pageViewCount: number;
};

export type QingYanBootstrapViewer = {
	verifiedAuthor?: {
		displayName: string;
		badgeLabel: string;
	};
};

export type QingYanThreadPage = {
	thread: {
		siteKey: string;
		pageKey: string;
		pageTitle?: string | null;
	};
	pagination: {
		sortBy: CommentSortBy;
		limit: number;
		offset: number;
		totalCount: number;
		rootCount: number;
	};
	comments: CanonicalComment[];
};

export type QingYanBootstrapPayload = QingYanThreadPage & {
	capability: CommentCapability;
	commentForm: CommentForm;
	viewer: QingYanBootstrapViewer;
	pageMetrics: QingYanPageMetrics;
	pageFeedback: QingYanPageFeedbackState;
	captcha: CommentCaptchaState | null;
};

export type QingYanCreateCommentResult = {
	comment: {
		id: string;
		status: CommentStatus;
		message?: string;
	};
	thread: {
		commentCount: number;
		rootCommentCount: number;
	};
};

export type QingYanVoteResult = {
	commentId: string;
	voteUp: number;
	voteDown: number;
	viewerVote: CommentVoteChoice | null;
};

export type QingYanApiErrorShape = {
	code?: string;
	message?: string;
	requestId?: string | null;
	details?: unknown;
};
