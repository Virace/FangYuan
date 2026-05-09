export type CommentStatus =
	| "approved"
	| "pending_remote"
	| "local_pending"
	| "rejected"
	| "spam";

export type CommentAuthor = {
	name: string;
	email?: string;
	emailHash?: string;
	website?: string | null;
	gravatarUrl?: string | null;
};

export type CommentVoteChoice = "up" | "down";

export type CanonicalComment = {
	id: string;
	postId: string;
	parentId: string | null;
	author: CommentAuthor;
	content: {
		raw: string;
		html: string;
	};
	status: CommentStatus;
	createdAt: string;
	updatedAt?: string | null;
	replyCount: number;
	voteUp: number;
	voteDown: number;
	viewerVote?: CommentVoteChoice | null;
	children: CanonicalComment[];
};

export type PendingEditTokenPayload = {
	commentId: string;
	postId: string;
	expiresAt: number;
};
