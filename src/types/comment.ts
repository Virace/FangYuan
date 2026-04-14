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
	avatarUrl?: string | null;
};

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
	children: CanonicalComment[];
};

export type PendingEditTokenPayload = {
	commentId: string;
	postId: string;
	expiresAt: number;
};
