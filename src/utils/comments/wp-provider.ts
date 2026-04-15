import type { CanonicalComment, CommentStatus } from "@/types/comment";
import {
	CommentProvider,
	type CommentCapability,
	type CommentSortBy,
	type CommentThreadPage,
	type CreateCommentInput,
	type GetCommentThreadInput,
} from "./provider";
import {
	DEFAULT_COMMENT_ROOT_LIMIT,
	DEFAULT_COMMENT_SORT_BY,
	normalizeCommentOffset,
} from "./options";

export type WpCommentProviderConfig = {
	apiBase: string;
};

type WpPostRecord = {
	id: number;
	slug: string;
	comment_status?: string;
};

type WpCommentRecord = {
	id: number;
	post: number;
	parent: number;
	status?: string;
	date: string;
	date_gmt?: string;
	link?: string;
	author_name?: string;
	author_url?: string;
	author_avatar_urls?: Record<string, string>;
	content?: {
		rendered?: string;
		raw?: string;
	};
};

async function fetchWpJson<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		mode: "cors",
		...init,
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			...(init?.headers ?? {}),
		},
	});

	if (!response.ok) {
		const payload = await response.text();

		try {
			const parsed = JSON.parse(payload) as { message?: string };
			throw new Error(parsed.message || `WordPress API request failed: ${response.status}`);
		} catch {
			throw new Error(payload || `WordPress API request failed: ${response.status}`);
		}
	}

	return (await response.json()) as T;
}

function mapWpStatus(status?: string): CommentStatus {
	switch (status) {
		case "approve":
		case "approved":
			return "approved";
		case "hold":
		case "pending":
		case "unapproved":
			return "pending_remote";
		case "spam":
			return "spam";
		case "trash":
		case "rejected":
			return "rejected";
		default:
			return "pending_remote";
	}
}

function mapWpComment(postKey: string, comment: WpCommentRecord): CanonicalComment {
	const html = comment.content?.rendered ?? "";
	const avatarCandidates = Object.values(comment.author_avatar_urls ?? {});

	return {
		id: String(comment.id),
		postId: postKey,
		parentId: comment.parent ? String(comment.parent) : null,
		author: {
			name: comment.author_name || "Anonymous",
			website: comment.author_url || null,
			avatarUrl: avatarCandidates.at(-1) ?? null,
		},
		content: {
			raw: comment.content?.raw ?? html,
			html,
		},
		status: mapWpStatus(comment.status),
		createdAt: comment.date_gmt || comment.date,
		updatedAt: null,
		replyCount: 0,
		voteUp: 0,
		voteDown: 0,
		viewerVote: null,
		children: [],
	};
}

function sortWpRoots(
	comments: CanonicalComment[],
	sortBy: CommentSortBy,
): CanonicalComment[] {
	return [...comments].sort((left, right) => {
		const leftTime = new Date(left.createdAt).getTime();
		const rightTime = new Date(right.createdAt).getTime();

		return sortBy === "date_asc" ? leftTime - rightTime : rightTime - leftTime;
	});
}

function paginateWpThread(
	comments: CanonicalComment[],
	limit: number,
	offset: number,
	sortBy: CommentSortBy,
): CommentThreadPage {
	const roots = sortWpRoots(
		comments.filter((comment) => !comment.parentId),
		sortBy,
	);
	const pagedRoots = roots.slice(offset, offset + limit);
	const pagedRootIdSet = new Set(pagedRoots.map((comment) => comment.id));
	const commentMap = new Map(comments.map((comment) => [comment.id, comment]));

	function belongsToPagedRoot(comment: CanonicalComment): boolean {
		let parentId = comment.parentId;

		while (parentId) {
			if (pagedRootIdSet.has(parentId)) {
				return true;
			}

			parentId = commentMap.get(parentId)?.parentId ?? null;
		}

		return false;
	}

	return {
		comments: [
			...pagedRoots,
			...comments.filter(
				(comment) => comment.parentId !== null && belongsToPagedRoot(comment),
			),
		],
		totalCount: comments.length,
		rootsCount: roots.length,
		limit,
		offset,
		sortBy,
	};
}

export class WpCommentProvider extends CommentProvider {
	readonly kind = "wp";
	readonly config: WpCommentProviderConfig;

	constructor(config: WpCommentProviderConfig) {
		super();
		this.config = {
			apiBase: config.apiBase.trim().replace(/\/+$/, ""),
		};
	}

	private buildEndpoint(
		pathname: string,
		params?: Record<string, string | number | undefined>,
	): string {
		const url = new URL(`${this.config.apiBase}${pathname}`);

		for (const [key, value] of Object.entries(params ?? {})) {
			if (value !== undefined && value !== "") {
				url.searchParams.set(key, String(value));
			}
		}

		return url.toString();
	}

	private async resolvePost(postKey: string): Promise<WpPostRecord> {
		const posts = await fetchWpJson<WpPostRecord[]>(
			this.buildEndpoint("/wp/v2/posts", {
				slug: postKey,
				_fields: "id,slug,comment_status",
				per_page: 1,
			}),
		);

		const post = posts[0];
		if (!post) {
			throw new Error(`WordPress post not found for slug: ${postKey}`);
		}

		return post;
	}

	async getCapability(postKey: string): Promise<CommentCapability> {
		const post = await this.resolvePost(postKey);
		const commentsOpen = post.comment_status !== "closed";

		return {
			enabled: commentsOpen,
			provider: this.kind,
			supportsReply: commentsOpen,
			supportsVote: false,
			message: commentsOpen ? undefined : "Comments are closed for this post.",
		};
	}

	async getThread(input: GetCommentThreadInput) {
		const post = await this.resolvePost(input.postKey);
		const comments = await fetchWpJson<WpCommentRecord[]>(
			this.buildEndpoint("/wp/v2/comments", {
				post: post.id,
				per_page: 100,
				order: "asc",
				orderby: "date",
				_fields:
					"id,post,parent,status,date,date_gmt,link,author_name,author_url,author_avatar_urls,content",
			}),
		);
		const limit = Math.max(
			1,
			Math.floor(input.limit ?? DEFAULT_COMMENT_ROOT_LIMIT),
		);
		const offset = normalizeCommentOffset(input.offset);
		const sortBy = input.sortBy ?? DEFAULT_COMMENT_SORT_BY;

		return paginateWpThread(
			comments.map((comment) => mapWpComment(input.postKey, comment)),
			limit,
			offset,
			sortBy,
		);
	}

	async createComment(input: CreateCommentInput) {
		const post = await this.resolvePost(input.postKey);
		const createdComment = await fetchWpJson<WpCommentRecord>(
			this.buildEndpoint("/wp/v2/comments"),
			{
				method: "POST",
				body: JSON.stringify({
					post: post.id,
					parent: input.parentId ? Number(input.parentId) : undefined,
					author_name: input.author.name,
					author_email: input.author.email,
					author_url: input.author.website ?? undefined,
					content: input.content,
				}),
			},
		);

		return mapWpComment(input.postKey, createdComment);
	}
}
