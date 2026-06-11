import type {
	CanonicalComment,
	CommentStatus,
	CommentVoteChoice,
} from "@/types/comment";
import {
	commentConfig,
	qingyanConfig as globalQingYanConfig,
} from "../../config";
import {
	type CommentAuthorField,
	CommentCaptchaRequiredError,
	type CommentCaptchaState,
	type CommentForm,
	type CommentSortBy,
	type CreateCommentInput,
} from "../comments/provider";
import { renderPlainCommentHtml } from "../comments/validation";
import type {
	QingYanApiErrorShape,
	QingYanBootstrapInput,
	QingYanBootstrapPayload,
	QingYanClientConfig,
	QingYanCreateCommentResult,
	QingYanPageFeedbackState,
	QingYanThreadInput,
	QingYanThreadPage,
	QingYanVoteResult,
} from "./contracts";

type BackendSortBy = "newest" | "oldest";

type RawQingYanComment = {
	id: string;
	parentId: string | null;
	author: {
		name: string;
		website?: string | null;
		avatarUrl?: string | null;
		badge?: {
			label: string;
		} | null;
	};
	content: {
		raw: string;
		html: string;
	};
	status: string;
	isPinned: boolean;
	isFolded: boolean;
	replyCount: number;
	vote?: {
		up: number;
		down: number;
		viewer?: CommentVoteChoice | null;
	};
	createdAt: string | null;
	updatedAt: string | null;
	children?: RawQingYanComment[];
};

type RawQingYanFeatureDisabledReason =
	| "site_disabled"
	| "page_inactive"
	| "comments_disabled"
	| "feature_disabled"
	| "unsupported";

type RawQingYanFeatureFlag = {
	enabled: boolean;
	reason?: RawQingYanFeatureDisabledReason;
};

type RawQingYanFeatures = {
	comments: RawQingYanFeatureFlag;
	commentReplies: RawQingYanFeatureFlag & {
		maxDepth?: number;
	};
	commentVotes: RawQingYanFeatureFlag;
	commentCaptcha: RawQingYanFeatureFlag & {
		mode?: "never" | "always" | "threshold";
	};
	pageViews: RawQingYanFeatureFlag;
	pageLikes: RawQingYanFeatureFlag;
	visitors: RawQingYanFeatureFlag;
	replyEmailNotification: RawQingYanFeatureFlag;
};

type RawQingYanCommentForm = {
	allow: CommentAuthorField[];
	require: CommentAuthorField[];
};

type RawQingYanCaptchaState = {
	required: boolean;
	verified: boolean;
	mode: "inline_value" | null;
	challenge?: {
		challengeId?: string;
		mode: "inline_value";
		imageData?: string | null;
	} | null;
};

type RawQingYanCommentDisplay = {
	avatar: {
		external: {
			enabled: boolean;
		};
		display?: {
			shape: "circle" | "rounded" | "square";
			sizePx: number;
		};
	};
};

type RawQingYanBootstrapResponse = {
	schemaVersion: string;
	site: {
		siteKey: string;
	};
	page: {
		pageKey: string;
		status: string;
	};
	features: RawQingYanFeatures;
	data: {
		comments?: {
			form: RawQingYanCommentForm;
			display: RawQingYanCommentDisplay;
			pagination: RawQingYanThreadResponse["pagination"];
			items: RawQingYanComment[];
			captcha?: RawQingYanCaptchaState | null;
		};
		pageViews?: {
			count: number;
		};
		pageLikes?: {
			count: number;
			liked: boolean;
		};
	};
	viewer?: {
		verifiedAuthor?: {
			displayName: string;
			badgeLabel: string;
		};
	};
};

type RawQingYanThreadResponse = {
	display: RawQingYanCommentDisplay;
	pagination: {
		sortBy: BackendSortBy;
		limit: number;
		offset: number;
		totalCount: number;
		rootCount: number;
	};
	items: RawQingYanComment[];
};

type RawQingYanLegacyCreateComment = {
	id: string;
	status: "pending" | "approved";
	message?: string;
};

type RawQingYanCreateCommentResponse = {
	comment: RawQingYanComment | RawQingYanLegacyCreateComment;
	thread: {
		commentCount: number;
		rootCommentCount: number;
	};
};

type RawQingYanVoteResponse = {
	commentId: string;
	vote: {
		up: number;
		down: number;
		viewer?: CommentVoteChoice | null;
	};
};

type RawQingYanLikeResponse = {
	pageLikes: {
		count: number;
		liked: boolean;
	};
};

type RawQingYanErrorResponse = {
	error?: QingYanApiErrorShape;
};

export class QingYanApiError extends Error {
	readonly status: number | null;
	readonly code: string | null;
	readonly requestId: string | null;
	readonly details: unknown;

	constructor(input: {
		message: string;
		status?: number | null;
		code?: string | null;
		requestId?: string | null;
		details?: unknown;
	}) {
		super(input.message);
		this.name = "QingYanApiError";
		this.status = input.status ?? null;
		this.code = input.code ?? null;
		this.requestId = input.requestId ?? null;
		this.details = input.details ?? null;
	}
}

function isCaptchaRequiredCode(code: string | null): boolean {
	return (
		code === "COMMENT_CAPTCHA_REQUIRED" ||
		code === "VOTE_CAPTCHA_REQUIRED" ||
		code === "PAGE_FEEDBACK_CAPTCHA_REQUIRED"
	);
}

type InlineCaptchaPayload = {
	challengeId: string;
	value: string;
};

export type QingYanClient = {
	fetchPostEngagementBootstrap(
		input: QingYanBootstrapInput,
	): Promise<QingYanBootstrapPayload>;
	fetchCommentThread(input: QingYanThreadInput): Promise<QingYanThreadPage>;
	getCaptchaState(input: {
		pageKey: string;
		pageTitle?: string;
		pageUrl?: string;
	}): Promise<CommentCaptchaState | null>;
	refreshCaptcha(input: {
		pageKey: string;
		pageTitle?: string;
		pageUrl?: string;
	}): Promise<CommentCaptchaState | null>;
	createComment(
		input: CreateCommentInput & { pageUrl?: string },
	): Promise<QingYanCreateCommentResult & { createdComment: CanonicalComment }>;
	voteComment(input: {
		pageKey: string;
		commentId: string;
		choice: CommentVoteChoice;
		pageTitle?: string;
		pageUrl?: string;
		captcha?: InlineCaptchaPayload | null;
	}): Promise<QingYanVoteResult>;
	likePage(input: {
		pageKey: string;
		pageTitle?: string;
		pageUrl?: string;
		captcha?: InlineCaptchaPayload | null;
	}): Promise<QingYanPageFeedbackState>;
	invalidateBootstrap(pageKey: string): void;
};

function toBackendSortBy(sortBy: CommentSortBy | undefined): BackendSortBy {
	return sortBy === "date_asc" ? "oldest" : "newest";
}

function fromBackendSortBy(sortBy: BackendSortBy): CommentSortBy {
	return sortBy === "oldest" ? "date_asc" : "date_desc";
}

function resolveCommentStatus(status: string): CommentStatus {
	switch (status) {
		case "approved":
			return "approved";
		case "rejected":
			return "rejected";
		case "spam":
			return "spam";
		default:
			return "pending_remote";
	}
}

function normalizeComment(
	comment: RawQingYanComment,
	postId: string,
): CanonicalComment {
	return {
		id: comment.id,
		postId,
		parentId: comment.parentId ?? null,
		author: {
			name: comment.author.name,
			website: comment.author.website ?? null,
			avatarUrl: comment.author.avatarUrl ?? null,
			badge: comment.author.badge?.label
				? { label: comment.author.badge.label }
				: null,
		},
		content: {
			raw: comment.content.raw,
			html: comment.content.html,
		},
		status: resolveCommentStatus(comment.status),
		createdAt: comment.createdAt ?? "",
		updatedAt: comment.updatedAt ?? null,
		replyCount: comment.replyCount,
		voteUp: comment.vote?.up ?? 0,
		voteDown: comment.vote?.down ?? 0,
		viewerVote: comment.vote?.viewer ?? null,
		children: (comment.children ?? []).map((child) =>
			normalizeComment(child, postId),
		),
	};
}

function isRawQingYanComment(
	comment: RawQingYanCreateCommentResponse["comment"],
): comment is RawQingYanComment {
	return "author" in comment && "content" in comment && "createdAt" in comment;
}

function normalizeCapability(
	features: RawQingYanFeatures,
): QingYanBootstrapPayload["capability"] {
	return {
		enabled: features.comments.enabled,
		provider: "qingyan",
		supportsReply: features.commentReplies.enabled,
		supportsVote: features.commentVotes.enabled,
		supportsCaptcha: features.commentCaptcha.enabled,
		supportsReplyEmailNotification:
			features.replyEmailNotification.enabled === true,
		persistenceMode: "persistent",
		identityModel: "page_key",
		message: features.comments.reason ?? undefined,
	};
}

function normalizeCommentForm(commentForm: RawQingYanCommentForm): CommentForm {
	return {
		allow: commentForm.allow,
		require: commentForm.require,
	};
}

function normalizeCaptchaState(
	state: RawQingYanCaptchaState | null | undefined,
): CommentCaptchaState | null {
	if (!state) {
		return null;
	}

	return {
		required: state.required,
		verified: state.verified,
		mode: state.mode,
		verificationModel: "backend_session",
		challenge: state.challenge
			? {
					mode: "inline_value",
					inputType: "text",
					imageData: state.challenge.imageData ?? null,
					metadata: state.challenge.challengeId
						? {
								challengeId: state.challenge.challengeId,
							}
						: undefined,
				}
			: null,
	};
}

function normalizeThreadPage(
	response: RawQingYanThreadResponse,
	postId: string,
	thread: QingYanThreadPage["thread"],
): QingYanThreadPage {
	return {
		thread,
		pagination: {
			sortBy: fromBackendSortBy(response.pagination.sortBy),
			limit: response.pagination.limit,
			offset: response.pagination.offset,
			totalCount: response.pagination.totalCount,
			rootCount: response.pagination.rootCount,
		},
		comments: response.items.map((comment) =>
			normalizeComment(comment, postId),
		),
	};
}

function normalizeBootstrap(
	response: RawQingYanBootstrapResponse,
	postId: string,
	pageTitle?: string,
): QingYanBootstrapPayload {
	const commentsData = response.data.comments;
	const threadPage = normalizeThreadPage(
		{
			display: commentsData?.display ?? {
				avatar: { external: { enabled: false } },
			},
			pagination: commentsData?.pagination ?? {
				sortBy: "newest",
				limit: 0,
				offset: 0,
				totalCount: 0,
				rootCount: 0,
			},
			items: commentsData?.items ?? [],
		},
		postId,
		{
			siteKey: response.site.siteKey,
			pageKey: response.page.pageKey,
			pageTitle: pageTitle ?? null,
		},
	);
	return {
		...threadPage,
		capability: normalizeCapability(response.features),
		commentForm: normalizeCommentForm(
			commentsData?.form ?? { allow: [], require: [] },
		),
		viewer: response.viewer ?? {},
		pageMetrics: {
			enabled: response.features.pageViews.enabled,
			pageViewCount: response.data.pageViews?.count ?? 0,
		},
		pageFeedback: {
			supportsLike: response.features.pageLikes.enabled,
			likeCount: response.data.pageLikes?.count ?? 0,
			liked: response.data.pageLikes?.liked ?? false,
		},
		captcha: normalizeCaptchaState(commentsData?.captcha),
	};
}

function buildOptimisticComment(
	input: CreateCommentInput & { pageUrl?: string },
	result: RawQingYanLegacyCreateComment,
): CanonicalComment {
	return {
		id: result.id,
		postId: input.postKey,
		parentId: input.parentId ?? null,
		author: {
			name: input.author.name,
			email: input.author.email || undefined,
			website: input.author.website ?? null,
		},
		content: {
			raw: input.content,
			html: renderPlainCommentHtml(input.content),
		},
		status: resolveCommentStatus(result.status),
		createdAt: new Date().toISOString(),
		updatedAt: null,
		replyCount: 0,
		voteUp: 0,
		voteDown: 0,
		viewerVote: null,
		children: [],
	};
}

function resolvePageUrl(value?: string): string | undefined {
	if (value) {
		return value;
	}

	if (typeof window !== "undefined") {
		return window.location.href;
	}

	return undefined;
}

function createBootstrapCacheKey(
	config: Required<QingYanClientConfig>,
	input: Required<
		Pick<
			QingYanBootstrapInput,
			"pageKey" | "pageTitle" | "pageUrl" | "sortBy" | "limit" | "offset"
		>
	>,
): string {
	return [
		config.apiBase,
		config.siteKey,
		input.pageKey,
		input.pageTitle,
		input.pageUrl,
		input.sortBy,
		String(input.limit),
		String(input.offset),
	].join("|");
}

async function parseResponse<T>(response: Response): Promise<T> {
	const contentType = response.headers.get("content-type") ?? "";
	const payload =
		contentType.includes("application/json") && response.status !== 204
			? ((await response.json()) as T | RawQingYanErrorResponse)
			: null;

	if (!response.ok) {
		const errorShape = (payload as RawQingYanErrorResponse | null)?.error;
		throw new QingYanApiError({
			message: errorShape?.message || response.statusText || "Request failed.",
			status: response.status,
			code: errorShape?.code ?? null,
			requestId: errorShape?.requestId ?? null,
			details: errorShape?.details ?? null,
		});
	}

	return payload as T;
}

function buildQueryString(input: Record<string, string | number | undefined>) {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(input)) {
		if (value === undefined || value === "") {
			continue;
		}
		params.set(key, String(value));
	}

	return params.toString();
}

function resolveQingYanConfig(): QingYanClientConfig | null {
	return globalQingYanConfig;
}

export function createQingYanClient(
	config: QingYanClientConfig,
): QingYanClient {
	const resolvedConfig = {
		apiBase: config.apiBase ?? "/api",
		siteKey: config.siteKey,
	};
	const bootstrapCache = new Map<string, QingYanBootstrapPayload>();
	const inflightBootstrap = new Map<string, Promise<QingYanBootstrapPayload>>();

	async function fetchJson<T>(path: string, init?: RequestInit) {
		const response = await fetch(`${resolvedConfig.apiBase}${path}`, {
			credentials: "same-origin",
			headers: {
				Accept: "application/json",
				...(init?.body
					? {
							"Content-Type": "application/json",
						}
					: {}),
				...(init?.headers ?? {}),
			},
			...init,
		});

		return parseResponse<T>(response);
	}

	function invalidateBootstrap(pageKey: string): void {
		for (const key of [...bootstrapCache.keys()]) {
			if (key.includes(`|${pageKey}|`)) {
				bootstrapCache.delete(key);
			}
		}
		for (const key of [...inflightBootstrap.keys()]) {
			if (key.includes(`|${pageKey}|`)) {
				inflightBootstrap.delete(key);
			}
		}
	}

	async function createCaptchaRequiredError(
		error: QingYanApiError,
		input: {
			pageKey: string;
			pageTitle?: string;
			pageUrl?: string;
		},
	) {
		const state = await fetchJson<RawQingYanCaptchaState>(
			`/comments/captcha/state/?${buildQueryString({
				siteKey: resolvedConfig.siteKey,
				pageTitle: input.pageTitle,
			})}`,
		);
		return new CommentCaptchaRequiredError(
			error.message,
			normalizeCaptchaState(state),
		);
	}

	return {
		async fetchPostEngagementBootstrap(
			input: QingYanBootstrapInput,
		): Promise<QingYanBootstrapPayload> {
			const normalizedInput = {
				pageKey: input.pageKey,
				pageTitle: input.pageTitle ?? "",
				pageUrl: resolvePageUrl(input.pageUrl) ?? "",
				sortBy: input.sortBy ?? "date_desc",
				limit: input.limit ?? commentConfig.rootLimit ?? 5,
				offset: input.offset ?? 0,
			};
			const cacheKey = createBootstrapCacheKey(resolvedConfig, normalizedInput);
			const cached = bootstrapCache.get(cacheKey);
			if (cached) {
				return cached;
			}

			const inflight = inflightBootstrap.get(cacheKey);
			if (inflight) {
				return inflight;
			}

			const request = fetchJson<RawQingYanBootstrapResponse>(
				`/comments/bootstrap/?${buildQueryString({
					siteKey: resolvedConfig.siteKey,
					pageTitle: normalizedInput.pageTitle || undefined,
					sortBy: toBackendSortBy(normalizedInput.sortBy),
					limit: normalizedInput.limit,
					offset: normalizedInput.offset,
				})}`,
			)
				.then((response) =>
					normalizeBootstrap(
						response,
						normalizedInput.pageKey,
						normalizedInput.pageTitle || undefined,
					),
				)
				.then((payload) => {
					bootstrapCache.set(cacheKey, payload);
					return payload;
				})
				.finally(() => {
					inflightBootstrap.delete(cacheKey);
				});

			inflightBootstrap.set(cacheKey, request);
			return request;
		},

		async fetchCommentThread(
			input: QingYanThreadInput,
		): Promise<QingYanThreadPage> {
			const response = await fetchJson<RawQingYanThreadResponse>(
				`/comments/thread/?${buildQueryString({
					siteKey: resolvedConfig.siteKey,
					sortBy: toBackendSortBy(input.sortBy),
					limit: input.limit ?? commentConfig.rootLimit ?? 5,
					offset: input.offset ?? 0,
				})}`,
			);
			return normalizeThreadPage(response, input.pageKey, {
				siteKey: resolvedConfig.siteKey,
				pageKey: input.pageKey,
				pageTitle: input.pageTitle ?? null,
			});
		},

		async getCaptchaState(input: {
			pageKey: string;
			pageTitle?: string;
			pageUrl?: string;
		}): Promise<CommentCaptchaState | null> {
			const response = await fetchJson<RawQingYanCaptchaState>(
				`/comments/captcha/state/?${buildQueryString({
					siteKey: resolvedConfig.siteKey,
					pageTitle: input.pageTitle,
				})}`,
			);
			return normalizeCaptchaState(response);
		},

		async refreshCaptcha(input: {
			pageKey: string;
			pageTitle?: string;
			pageUrl?: string;
		}): Promise<CommentCaptchaState | null> {
			const response = await fetchJson<RawQingYanCaptchaState>(
				"/comments/captcha/refresh/",
				{
					method: "POST",
					body: JSON.stringify({
						siteKey: resolvedConfig.siteKey,
						...(input.pageTitle
							? {
									pageTitle: input.pageTitle,
								}
							: {}),
					}),
				},
			);
			return normalizeCaptchaState(response);
		},

		async createComment(
			input: CreateCommentInput & { pageUrl?: string },
		): Promise<
			QingYanCreateCommentResult & { createdComment: CanonicalComment }
		> {
			try {
				const response = await fetchJson<RawQingYanCreateCommentResponse>(
					"/comments/",
					{
						method: "POST",
						body: JSON.stringify({
							siteKey: resolvedConfig.siteKey,
							pageTitle: input.postTitle ?? input.postKey,
							parentCommentId: input.parentId ?? null,
							author: {
								name: input.author.name,
								...(input.author.email
									? {
											email: input.author.email,
										}
									: {}),
								...(input.author.website
									? {
											website: input.author.website,
										}
									: {}),
							},
							content: {
								raw: input.content,
							},
							...(input.captcha
								? {
										captcha: {
											challengeId: input.captcha.challengeId,
											value: input.captcha.value,
										},
									}
								: {}),
							options: {
								notifyOnReply: input.notifyOnReply ?? false,
							},
						}),
					},
				);
				invalidateBootstrap(input.postKey);
				if (isRawQingYanComment(response.comment)) {
					return {
						comment: {
							id: response.comment.id,
							status: resolveCommentStatus(response.comment.status),
						},
						thread: response.thread,
						createdComment: normalizeComment(response.comment, input.postKey),
					};
				}

				return {
					comment: {
						id: response.comment.id,
						status: resolveCommentStatus(response.comment.status),
						message: response.comment.message,
					},
					thread: response.thread,
					createdComment: buildOptimisticComment(input, response.comment),
				};
			} catch (error) {
				if (
					error instanceof QingYanApiError &&
					isCaptchaRequiredCode(error.code)
				) {
					throw await createCaptchaRequiredError(error, {
						pageKey: input.postKey,
						pageTitle: input.postTitle,
						pageUrl: input.pageUrl,
					});
				}
				throw error;
			}
		},

		async voteComment(input: {
			pageKey: string;
			commentId: string;
			choice: CommentVoteChoice;
			pageTitle?: string;
			pageUrl?: string;
			captcha?: InlineCaptchaPayload | null;
		}): Promise<QingYanVoteResult> {
			try {
				const response = await fetchJson<RawQingYanVoteResponse>(
					`/comments/${input.commentId}/vote/`,
					{
						method: "POST",
						body: JSON.stringify({
							siteKey: resolvedConfig.siteKey,
							choice: input.choice,
							...(input.captcha
								? {
										captcha: input.captcha,
									}
								: {}),
						}),
					},
				);
				invalidateBootstrap(input.pageKey);
				return {
					commentId: response.commentId,
					voteUp: response.vote.up,
					voteDown: response.vote.down,
					viewerVote: response.vote.viewer ?? null,
				};
			} catch (error) {
				if (
					error instanceof QingYanApiError &&
					isCaptchaRequiredCode(error.code)
				) {
					throw await createCaptchaRequiredError(error, {
						pageKey: input.pageKey,
						pageTitle: input.pageTitle,
						pageUrl: input.pageUrl,
					});
				}
				throw error;
			}
		},

		async likePage(input: {
			pageKey: string;
			pageTitle?: string;
			pageUrl?: string;
			captcha?: InlineCaptchaPayload | null;
		}): Promise<QingYanPageFeedbackState> {
			try {
				const response = await fetchJson<RawQingYanLikeResponse>(
					"/page-feedback/like/",
					{
						method: "POST",
						body: JSON.stringify({
							siteKey: resolvedConfig.siteKey,
							pageTitle: input.pageTitle ?? input.pageKey,
							...(input.captcha
								? {
										captcha: input.captcha,
									}
								: {}),
						}),
					},
				);
				invalidateBootstrap(input.pageKey);
				return {
					supportsLike: true,
					likeCount: response.pageLikes.count,
					liked: response.pageLikes.liked,
				};
			} catch (error) {
				if (
					error instanceof QingYanApiError &&
					isCaptchaRequiredCode(error.code)
				) {
					throw await createCaptchaRequiredError(error, input);
				}
				throw error;
			}
		},

		invalidateBootstrap,
	};
}

const qingyanClientCache = new Map<string, QingYanClient>();

export function getQingYanClient(
	config: QingYanClientConfig | null = resolveQingYanConfig(),
): QingYanClient | null {
	if (!config) {
		return null;
	}

	const resolvedConfig = {
		apiBase: config.apiBase ?? "/api",
		siteKey: config.siteKey,
	};
	const cacheKey = `${resolvedConfig.apiBase}|${resolvedConfig.siteKey}`;
	const cached = qingyanClientCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const client = createQingYanClient(resolvedConfig);
	qingyanClientCache.set(cacheKey, client);
	return client;
}
