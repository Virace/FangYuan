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
	voteUp: number;
	voteDown: number;
	viewerVote: CommentVoteChoice | null;
	createdAt: string;
	updatedAt: string | null;
	children: RawQingYanComment[];
};

type RawQingYanCapability = {
	enabled: boolean;
	supportsReply: boolean;
	supportsVote: boolean;
	supportsCaptcha: boolean;
	defaultStatus: "pending" | "approved";
	message?: string | null;
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

type RawQingYanBootstrapResponse = {
	capability: RawQingYanCapability;
	commentForm: RawQingYanCommentForm;
	viewer?: {
		verifiedAuthor?: {
			displayName: string;
			badgeLabel: string;
		};
	};
	thread: {
		siteKey: string;
		pageKey: string;
		pageTitle?: string | null;
	};
	pagination: {
		sortBy: BackendSortBy;
		limit: number;
		offset: number;
		totalCount: number;
		rootCount: number;
	};
	comments: RawQingYanComment[];
	pageMetrics: {
		pageViewCount: number;
	};
	pageFeedback: QingYanPageFeedbackState;
	captcha?: RawQingYanCaptchaState | null;
};

type RawQingYanThreadResponse = {
	thread: RawQingYanBootstrapResponse["thread"];
	pagination: RawQingYanBootstrapResponse["pagination"];
	comments: RawQingYanComment[];
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
	voteUp: number;
	voteDown: number;
	viewerVote: CommentVoteChoice | null;
};

type RawQingYanLikeResponse = {
	pageFeedback: QingYanPageFeedbackState;
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
		createdAt: comment.createdAt,
		updatedAt: comment.updatedAt ?? null,
		replyCount: comment.replyCount,
		voteUp: comment.voteUp,
		voteDown: comment.voteDown,
		viewerVote: comment.viewerVote ?? null,
		children: comment.children.map((child) => normalizeComment(child, postId)),
	};
}

function isRawQingYanComment(
	comment: RawQingYanCreateCommentResponse["comment"],
): comment is RawQingYanComment {
	return (
		"author" in comment &&
		"content" in comment &&
		"createdAt" in comment &&
		"children" in comment
	);
}

function normalizeCapability(
	capability: RawQingYanCapability,
): QingYanBootstrapPayload["capability"] {
	return {
		enabled: capability.enabled,
		provider: "qingyan",
		supportsReply: capability.supportsReply,
		supportsVote: capability.supportsVote,
		supportsCaptcha: capability.supportsCaptcha,
		persistenceMode: "persistent",
		identityModel: "page_key",
		message: capability.message ?? undefined,
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
): QingYanThreadPage {
	return {
		thread: response.thread,
		pagination: {
			sortBy: fromBackendSortBy(response.pagination.sortBy),
			limit: response.pagination.limit,
			offset: response.pagination.offset,
			totalCount: response.pagination.totalCount,
			rootCount: response.pagination.rootCount,
		},
		comments: response.comments.map((comment) =>
			normalizeComment(comment, postId),
		),
	};
}

function normalizeBootstrap(
	response: RawQingYanBootstrapResponse,
	postId: string,
): QingYanBootstrapPayload {
	const threadPage = normalizeThreadPage(response, postId);
	return {
		...threadPage,
		capability: normalizeCapability(response.capability),
		commentForm: normalizeCommentForm(response.commentForm),
		viewer: response.viewer ?? {},
		pageMetrics: response.pageMetrics,
		pageFeedback: response.pageFeedback,
		captcha: normalizeCaptchaState(response.captcha),
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
					normalizeBootstrap(response, normalizedInput.pageKey),
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
			return normalizeThreadPage(response, input.pageKey);
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
								notifyOnReply: false,
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
				return response;
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
				return response.pageFeedback;
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
