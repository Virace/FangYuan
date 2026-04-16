import type { CanonicalComment, CommentStatus } from "@/types/comment";
import {
	DEFAULT_COMMENT_SORT_BY,
	normalizeCommentOffset,
} from "../comments/options";
import type {
	CommentCapability,
	CommentSortBy,
	CommentThreadPage,
	CreateCommentInput,
	GetCommentThreadInput,
	VoteCommentInput,
} from "../comments/provider";
import { renderPlainCommentHtml } from "../comments/validation";
import {
	type ArtalkApiConfig,
	fetchArtalkJson,
	normalizeArtalkApiConfig,
} from "./core";

const DEFAULT_ARTALK_PAGE_SIZE = 100;

export type ArtalkCommentRecord = {
	id: number;
	content: string;
	content_marked?: string;
	nick?: string;
	email_encrypted?: string;
	link?: string;
	date: string;
	is_pending: boolean;
	is_allow_reply: boolean;
	visible: boolean;
	rid: number;
	page_key: string;
	site_name: string;
	vote_up: number;
	vote_down: number;
};

export type ArtalkCommentListResponse = {
	comments: ArtalkCommentRecord[];
	count: number;
	roots_count: number;
	page?: {
		admin_only?: boolean;
		pv?: number;
		vote_up?: number;
		vote_down?: number;
	};
};

export type ArtalkCommentDetailResponse = {
	comment: ArtalkCommentRecord;
	reply_comment?: ArtalkCommentRecord;
};

export type ArtalkVoteResponse = {
	up: number;
	down: number;
	is_up: boolean;
	is_down: boolean;
};

export type ArtalkVoteTargetName = "comment" | "page";

export type ArtalkCommentServiceConfig = ArtalkApiConfig & {
	pageSize?: number;
};

function buildVotePath(
	targetName: ArtalkVoteTargetName,
	targetId: string,
	choice?: "up" | "down",
): string {
	return choice
		? `/api/v2/votes/${targetName}/${targetId}/${choice}/`
		: `/api/v2/votes/${targetName}/${targetId}/`;
}

function normalizeArtalkDate(value: string): string {
	return value.includes("T") ? value : value.replace(" ", "T");
}

function mapArtalkStatus(comment: ArtalkCommentRecord): CommentStatus {
	if (comment.is_pending) {
		return "pending_remote";
	}

	if (!comment.visible) {
		return "rejected";
	}

	return "approved";
}

function mapArtalkViewerVote(vote: ArtalkVoteResponse): "up" | "down" | null {
	if (vote.is_up) {
		return "up";
	}

	if (vote.is_down) {
		return "down";
	}

	return null;
}

function buildArtalkCapability(
	page?: ArtalkCommentListResponse["page"],
): CommentCapability {
	const adminOnly = page?.admin_only ?? false;

	return {
		enabled: !adminOnly,
		provider: "artalk",
		supportsReply: !adminOnly,
		supportsVote: true,
		message: adminOnly
			? "Comments are only available to administrators for this page."
			: undefined,
	};
}

function mapArtalkComment(
	postKey: string,
	comment: ArtalkCommentRecord,
): CanonicalComment {
	return {
		id: String(comment.id),
		postId: comment.page_key || postKey,
		parentId: comment.rid ? String(comment.rid) : null,
		author: {
			name: comment.nick || "Anonymous",
			emailHash: comment.email_encrypted || undefined,
			website: comment.link || null,
		},
		content: {
			raw: comment.content || "",
			html:
				comment.content_marked || renderPlainCommentHtml(comment.content || ""),
		},
		status: mapArtalkStatus(comment),
		createdAt: normalizeArtalkDate(comment.date),
		updatedAt: null,
		replyCount: 0,
		voteUp: comment.vote_up ?? 0,
		voteDown: comment.vote_down ?? 0,
		viewerVote: null,
		children: [],
	};
}

export function createArtalkCommentsApi(config: ArtalkApiConfig) {
	const normalizedConfig = normalizeArtalkApiConfig(config);

	return {
		listComments(input: {
			postKey: string;
			sortBy: CommentSortBy;
			limit: number;
			offset: number;
		}) {
			return fetchArtalkJson<ArtalkCommentListResponse>(
				normalizedConfig,
				"/api/v2/comments/",
				{
					params: {
						page_key: input.postKey,
						site_name: normalizedConfig.siteName,
						flat_mode: true,
						scope: "page",
						sort_by: input.sortBy,
						limit: input.limit,
						offset: input.offset,
					},
				},
			);
		},

		getCommentDetail(commentId: string) {
			return fetchArtalkJson<ArtalkCommentDetailResponse>(
				normalizedConfig,
				`/api/v2/comments/${commentId}/`,
			);
		},

		getVote(targetName: ArtalkVoteTargetName, targetId: string) {
			return fetchArtalkJson<ArtalkVoteResponse>(
				normalizedConfig,
				buildVotePath(targetName, targetId),
			);
		},

		createComment(input: CreateCommentInput) {
			return fetchArtalkJson<ArtalkCommentRecord>(
				normalizedConfig,
				"/api/v2/comments/",
				{
					init: {
						method: "POST",
						body: JSON.stringify({
							site_name: normalizedConfig.siteName,
							page_key: input.postKey,
							page_title: input.postTitle || undefined,
							rid: input.parentId ? Number(input.parentId) : 0,
							name: input.author.name,
							email: input.author.email,
							link: input.author.website ?? undefined,
							content: input.content,
						}),
					},
				},
			);
		},

		voteTarget(
			targetName: ArtalkVoteTargetName,
			targetId: string,
			choice: "up" | "down",
		) {
			return fetchArtalkJson<ArtalkVoteResponse>(
				normalizedConfig,
				buildVotePath(targetName, targetId, choice),
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

export function createArtalkCommentService(config: ArtalkCommentServiceConfig) {
	const normalizedConfig = normalizeArtalkApiConfig(config);
	const pageSize = Math.max(
		1,
		Math.floor(config.pageSize ?? DEFAULT_ARTALK_PAGE_SIZE),
	);
	const artalkCommentsApi = createArtalkCommentsApi(normalizedConfig);
	const capabilityCache = new Map<string, CommentCapability>();

	return {
		async getCapability(postKey: string): Promise<CommentCapability> {
			const cachedCapability = capabilityCache.get(postKey);
			if (cachedCapability) {
				return cachedCapability;
			}

			const response = await artalkCommentsApi.listComments({
				postKey,
				sortBy: DEFAULT_COMMENT_SORT_BY,
				limit: 1,
				offset: 0,
			});
			const capability = buildArtalkCapability(response.page);
			capabilityCache.set(postKey, capability);
			return capability;
		},

		async getThread(input: GetCommentThreadInput): Promise<CommentThreadPage> {
			const limit = Math.max(1, Math.floor(input.limit ?? pageSize));
			const offset = normalizeCommentOffset(input.offset);
			const sortBy = input.sortBy ?? DEFAULT_COMMENT_SORT_BY;
			const response = await artalkCommentsApi.listComments({
				postKey: input.postKey,
				sortBy,
				limit,
				offset,
			});
			const capability = buildArtalkCapability(response.page);
			capabilityCache.set(input.postKey, capability);
			const comments = response.comments.map((comment) =>
				mapArtalkComment(input.postKey, comment),
			);

			return {
				comments,
				totalCount: response.count,
				rootsCount: response.roots_count,
				limit,
				offset,
				sortBy,
			};
		},

		async createComment(input: CreateCommentInput): Promise<CanonicalComment> {
			const createdComment = await artalkCommentsApi.createComment(input);
			return mapArtalkComment(input.postKey, createdComment);
		},

		async voteComment(input: VoteCommentInput): Promise<CanonicalComment> {
			const { commentId, choice } = input;
			const vote = await artalkCommentsApi.voteTarget(
				"comment",
				commentId,
				choice,
			);
			const detail = await artalkCommentsApi.getCommentDetail(commentId);

			return {
				...mapArtalkComment(detail.comment.page_key, detail.comment),
				voteUp: vote.up,
				voteDown: vote.down,
				viewerVote: mapArtalkViewerVote(vote),
			};
		},
	};
}
