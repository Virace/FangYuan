<script lang="ts">
import type { I18nKey as I18nKeyType } from "@i18n/i18nKey";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { type AutoDismissTone, getAutoDismissMs } from "@utils/browser/notice";
import {
	type CommenterProfile,
	clearCommenterProfile,
	loadCommenterProfile,
	saveCommenterProfile,
} from "@utils/comments/commenter-profile";
import {
	DEFAULT_COMMENT_SORT_BY,
	normalizeCommentOffset,
} from "@utils/comments/options";
import type {
	CommentAuthorField,
	CommentCapability,
	CommentCaptchaState,
	CommentCaptchaWriteInput,
	CommentForm,
} from "@utils/comments/provider";
import {
	CommentCaptchaRequiredError,
	type CommentSortBy,
} from "@utils/comments/provider";
import {
	countCommentsInTree,
	insertPendingComment,
	replaceCommentInTree,
} from "@utils/comments/tree";
import {
	applyPersistedViewerVotes,
	persistViewerVote,
} from "@utils/comments/vote-state";
import { getQingYanClient, QingYanApiError } from "@utils/qingyan/client";
import type {
	QingYanBootstrapViewer,
	QingYanClientConfig,
} from "@utils/qingyan/contracts";
import { onDestroy, onMount, tick } from "svelte";
import { fade, slide } from "svelte/transition";
import type { CanonicalComment, CommentVoteChoice } from "@/types/comment";
import CommentComposer from "./CommentComposer.svelte";
import CommentHeader from "./CommentHeader.svelte";
import CommentList from "./CommentList.svelte";

const contentTransitionDuration = 180;

type CommentComposerSubmitDetail = {
	authorName: string;
	authorEmail: string;
	authorWebsite: string;
	content: string;
	rememberProfile: boolean;
};

type CaptchaTarget =
	| { kind: "composer" }
	| { kind: "comment"; commentId: string }
	| null;

type VoteConfirmTarget = {
	commentId: string;
	choice: CommentVoteChoice;
} | null;

type PendingCommentAction = {
	kind: "comment_submit";
};

type PendingVoteAction = {
	kind: "comment_vote";
	commentId: string;
	choice: CommentVoteChoice;
};

type PendingAction = PendingCommentAction | PendingVoteAction | null;

type ComposerNotice = {
	message: string;
	tone: AutoDismissTone;
} | null;

type ReplyTarget = {
	authorName: string;
	avatarUrl?: string | null;
} | null;

type CommentNotice = {
	commentId: string;
	message: string;
	tone: AutoDismissTone;
} | null;

type FangYuanDebugWindow = Window & {
	__FANGYUAN_QINGYAN_DEBUG__?: Record<string, unknown>;
};

export let postKey: string;
export let postTitle = "";
export let postUrl = "";
export let rootLimit = 5;
export let maxDepth = 3;
export let qingyan: QingYanClientConfig | null = null;

const qingyanClient = getQingYanClient(qingyan);

let capability: CommentCapability | null = null;
let commentForm: CommentForm | null = null;
let viewer: QingYanBootstrapViewer = {};
let commenterProfile: CommenterProfile | null = null;
let comments: CanonicalComment[] = [];
let loading = true;
let submitting = false;
let captchaBusy = false;
let captchaError = "";
let captchaPrompt = "";
let activeReplyParentId: string | null = null;
let captchaState: CommentCaptchaState | null = null;
let activeCaptchaTarget: CaptchaTarget = null;
let currentSortBy: CommentSortBy = DEFAULT_COMMENT_SORT_BY;
let currentOffset = 0;
let totalRootCount = 0;
let activeReplyTarget: ReplyTarget = null;
let composerNotice: ComposerNotice = null;
let commentNotice: CommentNotice = null;
let composerNoticeTimer: ReturnType<typeof setTimeout> | null = null;
let commentNoticeTimer: ReturnType<typeof setTimeout> | null = null;
let captchaFeedbackTimer: ReturnType<typeof setTimeout> | null = null;
let voteBusyCommentId: string | null = null;
let pendingVoteTarget: VoteConfirmTarget = null;
let pendingAction: PendingAction = null;
let captchaValue = "";
const defaultAllowedFields: CommentAuthorField[] = [
	"nickname",
	"email",
	"website",
];
const defaultRequiredFields: CommentAuthorField[] = ["nickname", "email"];

$: pageSize = Math.max(1, rootLimit);
$: currentPage =
	totalRootCount === 0 ? 1 : Math.floor(currentOffset / pageSize) + 1;
$: totalPages = Math.max(1, Math.ceil(totalRootCount / pageSize));
$: hasPreviousPage = currentOffset > 0;
$: hasNextPage = currentOffset + pageSize < totalRootCount;
$: activeCaptchaCommentId =
	activeCaptchaTarget?.kind === "comment"
		? activeCaptchaTarget.commentId
		: null;
$: activeCaptchaVoteChoice =
	activeCaptchaTarget?.kind === "comment" &&
	pendingAction?.kind === "comment_vote" &&
	pendingAction.commentId === activeCaptchaTarget.commentId
		? pendingAction.choice
		: null;
$: activeCommentNoticeId = commentNotice?.commentId ?? null;
$: activeVoteConfirmCommentId = pendingVoteTarget?.commentId ?? null;
$: composerNoticeMessage = composerNotice?.message ?? "";
$: composerNoticeTone = composerNotice?.tone ?? "info";
$: commentNoticeMessage = commentNotice?.message ?? "";
$: commentNoticeTone = commentNotice?.tone ?? "info";
$: pendingVoteChoice = pendingVoteTarget?.choice ?? null;
$: supportsVote = capability?.supportsVote ?? false;
$: supportsCaptcha = capability?.supportsCaptcha ?? false;
$: verifiedAuthor = viewer.verifiedAuthor ?? null;
$: usingVerifiedAuthor = Boolean(verifiedAuthor);
$: allowedFields = commentForm?.allow ?? defaultAllowedFields;
$: requiredFields = usingVerifiedAuthor
	? []
	: (commentForm?.require ?? defaultRequiredFields);
$: showComposerCaptcha =
	supportsCaptcha &&
	activeCaptchaTarget?.kind === "composer" &&
	Boolean(captchaState?.required);
$: showCommentLoadingOverlay = loading && comments.length > 0;
$: showCommentInitialSkeleton = loading && comments.length === 0 && !capability;
$: showCommentEmptyState = comments.length === 0 && capability?.enabled;
$: showCommentSection = loading || capability?.enabled === true;
$: submitBlockedByCaptcha =
	pendingAction?.kind === "comment_submit" && showComposerCaptcha;
$: activeReplyTarget = activeReplyParentId
	? getReplyTarget(comments, activeReplyParentId)
	: null;

function logCommentError(context: string, error: unknown) {
	console.error(`[comments] ${context}`, error);
}

function clearComposerNoticeTimer() {
	if (composerNoticeTimer) {
		clearTimeout(composerNoticeTimer);
		composerNoticeTimer = null;
	}
}

function clearCommentNoticeTimer() {
	if (commentNoticeTimer) {
		clearTimeout(commentNoticeTimer);
		commentNoticeTimer = null;
	}
}

function clearCaptchaFeedbackTimer() {
	if (captchaFeedbackTimer) {
		clearTimeout(captchaFeedbackTimer);
		captchaFeedbackTimer = null;
	}
}

function setComposerNotice(message: string, tone: AutoDismissTone) {
	composerNotice = { message, tone };
	clearComposerNoticeTimer();
	composerNoticeTimer = setTimeout(
		() => {
			composerNotice = null;
		},
		getAutoDismissMs(message, tone),
	);
}

function setCommentNotice(
	commentId: string,
	message: string,
	tone: AutoDismissTone,
) {
	commentNotice = { commentId, message, tone };
	clearCommentNoticeTimer();
	commentNoticeTimer = setTimeout(
		() => {
			commentNotice = null;
		},
		getAutoDismissMs(message, tone),
	);
}

function clearCaptchaFeedback() {
	captchaPrompt = "";
	captchaError = "";
	clearCaptchaFeedbackTimer();
}

function setCaptchaPrompt(message: string) {
	captchaPrompt = message;
	captchaError = "";
	clearCaptchaFeedbackTimer();
	captchaFeedbackTimer = setTimeout(
		() => {
			captchaPrompt = "";
		},
		getAutoDismissMs(message, "info"),
	);
}

function setCaptchaError(message: string) {
	captchaError = message;
	clearCaptchaFeedbackTimer();
	captchaFeedbackTimer = setTimeout(
		() => {
			captchaError = "";
		},
		getAutoDismissMs(message, "error"),
	);
}

function getReplyTarget(
	commentList: CanonicalComment[],
	commentId: string,
): ReplyTarget {
	for (const comment of commentList) {
		if (comment.id === commentId) {
			return {
				authorName: comment.author.name,
				avatarUrl: comment.author.avatarUrl,
			};
		}

		const childTarget = getReplyTarget(comment.children, commentId);
		if (childTarget) {
			return childTarget;
		}
	}

	return null;
}

function clearActionNotices() {
	composerNotice = null;
	commentNotice = null;
	clearComposerNoticeTimer();
	clearCommentNoticeTimer();
}

function setTargetedNotice(
	target: CaptchaTarget,
	message: string,
	tone: AutoDismissTone,
) {
	if (target?.kind === "comment") {
		setCommentNotice(target.commentId, message, tone);
		return;
	}

	setComposerNotice(message, tone);
}

function clearVoteTransientState() {
	pendingVoteTarget = null;
	clearActionNotices();
}

function resetCaptchaFlow() {
	pendingAction = null;
	activeCaptchaTarget = null;
	captchaState = null;
	captchaValue = "";
	clearCaptchaFeedback();
}

function updateCommentDebugHook() {
	if (!import.meta.env.DEV || typeof window === "undefined") {
		return;
	}

	const nextDebug = {
		...((window as FangYuanDebugWindow).__FANGYUAN_QINGYAN_DEBUG__ ?? {}),
		comments: {
			postKey,
			activeCaptchaTarget,
			activeCaptchaVoteChoice,
			pendingAction,
			captchaState,
			captchaPrompt,
			captchaError,
			composerNotice,
			commentNotice,
			viewer,
			retryPendingAction: () => void handleSubmitCaptchaAction(),
			refreshCaptcha: () => void handleRefreshCaptcha(),
		},
	};
	(window as FangYuanDebugWindow).__FANGYUAN_QINGYAN_DEBUG__ = nextDebug;
}

function buildCaptchaWriteInput(): CommentCaptchaWriteInput | null {
	if (captchaState?.challenge?.mode !== "inline_value") {
		return null;
	}

	const challengeId = captchaState.challenge.metadata?.challengeId;
	const value = captchaValue.trim();
	if (!challengeId || !value) {
		return null;
	}

	return {
		challengeId,
		mode: "inline_value",
		value,
	};
}

function handleCancelVoteConfirm() {
	pendingVoteTarget = null;
}

function toCommentErrorMessage(
	error: unknown,
	fallbackKey: I18nKeyType,
): string {
	if (!(error instanceof Error)) {
		return i18n(fallbackKey);
	}

	if (error instanceof QingYanApiError) {
		const message = error.message.trim();
		const normalizedMessage = message.toLowerCase();
		if (
			!message ||
			normalizedMessage.includes("failed to fetch") ||
			error.status === null ||
			error.status >= 500
		) {
			return i18n(fallbackKey);
		}

		return message;
	}

	return i18n(fallbackKey);
}

function getCaptchaTargetSelector(target: CaptchaTarget): string | null {
	if (!target) {
		return null;
	}

	return target.kind === "composer"
		? '[data-comment-captcha-target="composer"]'
		: `[data-comment-captcha-target="${target.commentId}"]`;
}

async function revealCaptchaTarget(target: CaptchaTarget) {
	await tick();
	const selector = getCaptchaTargetSelector(target);
	if (!selector) {
		return;
	}

	const targetElement = document.querySelector<HTMLElement>(selector);
	targetElement?.scrollIntoView({
		behavior: "smooth",
		block: "center",
	});
}

function applyBootstrap(
	payload: Awaited<
		ReturnType<
			NonNullable<typeof qingyanClient>["fetchPostEngagementBootstrap"]
		>
	>,
) {
	capability = payload.capability;
	commentForm = payload.commentForm;
	viewer = payload.viewer;
	commenterProfile =
		qingyan && !payload.viewer.verifiedAuthor
			? loadCommenterProfile(qingyan.siteKey, payload.commentForm.allow)
			: null;
	comments = applyPersistedViewerVotes(postKey, payload.comments);
	currentSortBy = payload.pagination.sortBy;
	currentOffset = payload.pagination.offset;
	totalRootCount = payload.pagination.rootCount;
	captchaState = payload.captcha;
}

async function promptForCaptcha(
	nextState: CommentCaptchaState | null,
	target: CaptchaTarget,
) {
	if (!supportsCaptcha) {
		return;
	}

	try {
		activeCaptchaTarget = target;
		captchaValue = "";
		captchaState =
			nextState ??
			(qingyanClient
				? await qingyanClient.refreshCaptcha({
						pageKey: postKey,
						pageTitle: postTitle,
						pageUrl: postUrl,
					})
				: null);
		setCaptchaPrompt(i18n(I18nKey.commentsCaptchaRequiredTip));
		await revealCaptchaTarget(target);
	} catch (error) {
		logCommentError("prepare captcha prompt failed", error);
		setTargetedNotice(
			target,
			toCommentErrorMessage(error, I18nKey.commentsLoadFailed),
			"error",
		);
	}
}

async function loadInitialState() {
	loading = true;

	try {
		if (!qingyanClient) {
			capability = null;
			commentForm = null;
			viewer = {};
			commenterProfile = null;
			comments = [];
			captchaState = null;
			return;
		}

		const bootstrap = await qingyanClient.fetchPostEngagementBootstrap({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
		});
		applyBootstrap(bootstrap);
		activeCaptchaTarget = null;
		clearCaptchaFeedback();
		if (!bootstrap.capability.enabled) {
			comments = [];
			totalRootCount = 0;
			captchaState = null;
			activeCaptchaTarget = null;
			clearCaptchaFeedback();
		}
	} catch (error) {
		logCommentError("load comments failed", error);
	} finally {
		loading = false;
	}
}

async function loadComments(nextOptions?: {
	sortBy?: CommentSortBy;
	offset?: number;
}) {
	loading = true;

	try {
		if (!qingyanClient) {
			capability = null;
			commentForm = null;
			viewer = {};
			commenterProfile = null;
			comments = [];
			captchaState = null;
			return;
		}

		const nextSortBy = nextOptions?.sortBy ?? currentSortBy;
		const nextOffset = normalizeCommentOffset(
			nextOptions?.offset ?? currentOffset,
		);
		const threadPage = await qingyanClient.fetchCommentThread({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
			sortBy: nextSortBy,
			limit: pageSize,
			offset: nextOffset,
		});

		currentSortBy = threadPage.pagination.sortBy;
		currentOffset = threadPage.pagination.offset;
		totalRootCount = threadPage.pagination.rootCount;
		comments = applyPersistedViewerVotes(postKey, threadPage.comments);
	} catch (error) {
		logCommentError("load comments failed", error);
	} finally {
		loading = false;
	}
}

function handleReply(commentId: string) {
	activeReplyParentId = activeReplyParentId === commentId ? null : commentId;
	clearVoteTransientState();
}

function handleCancelReply() {
	activeReplyParentId = null;
	clearVoteTransientState();
}

async function handleRefreshCaptcha() {
	captchaBusy = true;
	captchaError = "";

	try {
		if (!qingyanClient || !supportsCaptcha) {
			return;
		}

		captchaState = await qingyanClient.refreshCaptcha({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
		});
		captchaValue = "";
	} catch (error) {
		logCommentError("refresh captcha failed", error);
		setCaptchaError(toCommentErrorMessage(error, I18nKey.commentsLoadFailed));
	} finally {
		captchaBusy = false;
	}
}

async function handleSubmitCaptchaAction() {
	if (
		pendingAction?.kind === "comment_vote" &&
		pendingAction.commentId &&
		pendingAction.choice
	) {
		await submitVote(pendingAction.commentId, pendingAction.choice);
	}
}

$: updateCommentDebugHook();

async function handleSortChange(sortBy: CommentSortBy) {
	if (sortBy === currentSortBy) {
		return;
	}

	activeReplyParentId = null;
	resetCaptchaFlow();
	clearVoteTransientState();
	await loadComments({
		sortBy,
		offset: 0,
	});
}

async function handlePageChange(offset: number) {
	const nextOffset = normalizeCommentOffset(offset);
	if (nextOffset === currentOffset) {
		return;
	}

	activeReplyParentId = null;
	resetCaptchaFlow();
	clearVoteTransientState();
	await loadComments({ offset: nextOffset });
}

function getCommentById(
	items: CanonicalComment[],
	commentId: string,
): CanonicalComment | null {
	for (const comment of items) {
		if (comment.id === commentId) {
			return comment;
		}

		const childMatch = getCommentById(comment.children, commentId);
		if (childMatch) {
			return childMatch;
		}
	}

	return null;
}

function requestVoteConfirm(commentId: string, choice: CommentVoteChoice) {
	activeCaptchaTarget = null;
	clearCaptchaFeedback();
	clearVoteTransientState();
	pendingVoteTarget = { commentId, choice };
}

async function handleSubmit(
	detail: CommentComposerSubmitDetail,
): Promise<boolean> {
	submitting = true;
	clearVoteTransientState();

	try {
		if (!qingyanClient) {
			return false;
		}

		if (submitBlockedByCaptcha && !buildCaptchaWriteInput()) {
			setCaptchaError(i18n(I18nKey.commentsValidationCaptchaRequired));
			await revealCaptchaTarget({ kind: "composer" });
			return false;
		}

		const result = await qingyanClient.createComment({
			postKey,
			postTitle,
			pageUrl: postUrl,
			parentId: activeReplyParentId,
			author: {
				name: verifiedAuthor?.displayName ?? detail.authorName,
				email: detail.authorEmail,
				website: detail.authorWebsite || null,
			},
			content: detail.content,
			captcha: submitBlockedByCaptcha ? buildCaptchaWriteInput() : null,
		});

		comments = insertPendingComment(comments, result.createdComment);
		if (!verifiedAuthor && qingyan) {
			if (detail.rememberProfile) {
				saveCommenterProfile(
					qingyan.siteKey,
					{
						authorName: detail.authorName,
						authorEmail: detail.authorEmail,
						authorWebsite: detail.authorWebsite,
					},
					allowedFields,
				);
				commenterProfile = loadCommenterProfile(qingyan.siteKey, allowedFields);
			} else {
				clearCommenterProfile(qingyan.siteKey);
				commenterProfile = null;
			}
		}
		totalRootCount = result.thread.rootCommentCount;
		activeReplyParentId = null;
		qingyanClient.invalidateBootstrap(postKey);
		resetCaptchaFlow();
		setComposerNotice(
			result.comment.status === "approved"
				? i18n(I18nKey.commentsSubmitSuccess)
				: i18n(I18nKey.commentsModerationNotice),
			"success",
		);
		return true;
	} catch (error) {
		if (error instanceof CommentCaptchaRequiredError) {
			pendingAction = { kind: "comment_submit" };
			await promptForCaptcha(error.state, { kind: "composer" });
		} else {
			const message = toCommentErrorMessage(
				error,
				I18nKey.commentsSubmitFailed,
			);
			if (submitBlockedByCaptcha) {
				setCaptchaError(message);
				await revealCaptchaTarget({ kind: "composer" });
			} else {
				logCommentError("submit comment failed", error);
				setComposerNotice(message, "error");
			}
		}
		return false;
	} finally {
		submitting = false;
	}
}

async function submitVote(commentId: string, choice: CommentVoteChoice) {
	if (!qingyanClient || !capability?.supportsVote || voteBusyCommentId) {
		return;
	}

	const previousComment = getCommentById(comments, commentId);
	if (!previousComment || previousComment.viewerVote) {
		return;
	}

	const isRetryingCaptchaVote =
		pendingAction?.kind === "comment_vote" &&
		pendingAction.commentId === commentId &&
		pendingAction.choice === choice;
	if (isRetryingCaptchaVote && !buildCaptchaWriteInput()) {
		setCaptchaError(i18n(I18nKey.commentsValidationCaptchaRequired));
		await revealCaptchaTarget({ kind: "comment", commentId });
		return;
	}

	voteBusyCommentId = commentId;
	pendingVoteTarget = null;

	try {
		const updatedVote = await qingyanClient.voteComment({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
			commentId,
			choice,
			captcha: isRetryingCaptchaVote ? buildCaptchaWriteInput() : null,
		});
		comments = replaceCommentInTree(comments, {
			...previousComment,
			voteUp: updatedVote.voteUp,
			voteDown: updatedVote.voteDown,
			viewerVote: updatedVote.viewerVote ?? choice,
		});
		persistViewerVote(postKey, commentId, updatedVote.viewerVote ?? choice);
		qingyanClient.invalidateBootstrap(postKey);
		resetCaptchaFlow();
	} catch (error) {
		if (error instanceof CommentCaptchaRequiredError) {
			pendingAction = {
				kind: "comment_vote",
				commentId,
				choice,
			};
			await promptForCaptcha(error.state, {
				kind: "comment",
				commentId,
			});
		} else {
			const message = toCommentErrorMessage(error, I18nKey.commentsVoteFailed);
			if (isRetryingCaptchaVote) {
				setCaptchaError(message);
				await revealCaptchaTarget({ kind: "comment", commentId });
			} else {
				logCommentError("vote comment failed", error);
				setCommentNotice(commentId, message, "error");
			}
		}
	} finally {
		voteBusyCommentId = null;
	}
}

async function handleVote(commentId: string, choice: CommentVoteChoice) {
	if (!qingyanClient || !capability?.supportsVote || voteBusyCommentId) {
		return;
	}

	const previousComment = getCommentById(comments, commentId);
	if (!previousComment || previousComment.viewerVote) {
		return;
	}

	if (
		pendingAction?.kind === "comment_vote" &&
		pendingAction.commentId === commentId &&
		pendingAction.choice === choice
	) {
		await submitVote(commentId, choice);
		return;
	}

	if (pendingAction) {
		await revealCaptchaTarget(activeCaptchaTarget);
		return;
	}

	requestVoteConfirm(commentId, choice);
}

async function handleConfirmVote(commentId: string, choice: CommentVoteChoice) {
	if (
		pendingVoteTarget?.commentId !== commentId ||
		pendingVoteTarget.choice !== choice
	) {
		return;
	}

	await submitVote(commentId, choice);
}

onMount(() => {
	void loadInitialState();
});

onDestroy(() => {
	clearComposerNoticeTimer();
	clearCommentNoticeTimer();
	clearCaptchaFeedbackTimer();
	if (import.meta.env.DEV && typeof window !== "undefined") {
		const nextDebug = {
			...((window as FangYuanDebugWindow).__FANGYUAN_QINGYAN_DEBUG__ ?? {}),
		};
		delete nextDebug.comments;
		(window as FangYuanDebugWindow).__FANGYUAN_QINGYAN_DEBUG__ = nextDebug;
	}
});
</script>

{#if showCommentSection}
	<section
		class="card-base mt-4 px-6 md:px-9 pt-6 pb-6 relative w-full"
		data-post-title={postTitle}
	>
		<CommentHeader count={countCommentsInTree(comments)} loading={loading} />

		{#if capability?.enabled}
			<div class="mb-5 flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
					<button
						type="button"
						class="comment-sort-tab"
						class:link-underline={currentSortBy !== "date_desc"}
						class:comment-sort-tab-active={currentSortBy === "date_desc"}
						class:comment-sort-tab-idle={currentSortBy !== "date_desc"}
						disabled={currentSortBy === "date_desc"}
						aria-pressed={currentSortBy === "date_desc"}
						on:click={() => void handleSortChange("date_desc")}
					>
						{i18n(I18nKey.commentsSortNewest)}
					</button>
					<button
						type="button"
						class="comment-sort-tab"
						class:link-underline={currentSortBy !== "date_asc"}
						class:comment-sort-tab-active={currentSortBy === "date_asc"}
						class:comment-sort-tab-idle={currentSortBy !== "date_asc"}
						disabled={currentSortBy === "date_asc"}
						aria-pressed={currentSortBy === "date_asc"}
						on:click={() => void handleSortChange("date_asc")}
					>
						{i18n(I18nKey.commentsSortOldest)}
					</button>
				</div>

				{#if totalRootCount > pageSize}
					<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-50">
						<button
							type="button"
							class="link-underline disabled:pointer-events-none disabled:opacity-40"
							disabled={!hasPreviousPage}
							on:click={() => void handlePageChange(currentOffset - pageSize)}
						>
							{i18n(I18nKey.commentsPaginationPrevious)}
						</button>
						<span>
							{i18n(I18nKey.commentsPaginationStatus)} {currentPage} / {totalPages}
						</span>
						<button
							type="button"
							class="link-underline disabled:pointer-events-none disabled:opacity-40"
							disabled={!hasNextPage}
							on:click={() => void handlePageChange(currentOffset + pageSize)}
						>
							{i18n(I18nKey.commentsPaginationNext)}
						</button>
					</div>
				{/if}
			</div>
		{/if}

		<div
			class="comments-content-shell mt-5"
			aria-busy={loading}
		>
			{#if showCommentInitialSkeleton}
				<div
					class="comment-thread-skeleton"
					in:fade={{ duration: contentTransitionDuration }}
					out:fade={{ duration: contentTransitionDuration }}
				></div>
			{:else if comments.length > 0}
				<div
					class="comments-content-stack"
					in:fade={{ duration: contentTransitionDuration }}
					out:fade={{ duration: contentTransitionDuration }}
				>
					<CommentList
						comments={comments}
						activeReplyParentId={activeReplyParentId}
						activeCaptchaCommentId={activeCaptchaCommentId}
						activeCaptchaVoteChoice={activeCaptchaVoteChoice}
						activeVoteConfirmCommentId={activeVoteConfirmCommentId}
						activeCommentNoticeId={activeCommentNoticeId}
						maxDepth={maxDepth}
						supportsVote={supportsVote}
						voteBusy={Boolean(voteBusyCommentId)}
						pendingVoteChoice={pendingVoteChoice}
						captchaState={captchaState}
						captchaBusy={captchaBusy}
						bind:captchaValue
						captchaError={captchaError}
						captchaPrompt={captchaPrompt}
						commentNoticeMessage={commentNoticeMessage}
						commentNoticeTone={commentNoticeTone}
						onVote={handleVote}
						onConfirmVote={handleConfirmVote}
						onCancelVoteConfirm={handleCancelVoteConfirm}
						onReply={handleReply}
						onRefreshCaptcha={handleRefreshCaptcha}
						onSubmitCaptcha={handleSubmitCaptchaAction}
					/>

					{#if showCommentLoadingOverlay}
						<div
							class="comment-loading-overlay"
							in:fade={{ duration: contentTransitionDuration }}
							out:fade={{ duration: contentTransitionDuration }}
						>
							<div class="comment-thread-skeleton"></div>
						</div>
					{/if}
				</div>
			{:else if showCommentEmptyState}
				<div
					class="comment-empty-state"
					in:fade={{ duration: contentTransitionDuration }}
					out:fade={{ duration: contentTransitionDuration }}
				>
					<p class="text-sm text-50">{i18n(I18nKey.commentsEmpty)}</p>
				</div>
			{/if}
		</div>

		<div class="mt-6">
			<CommentComposer
				showCaptcha={showComposerCaptcha}
				allowedFields={allowedFields}
				requiredFields={requiredFields}
				verifiedAuthor={verifiedAuthor}
				initialProfile={commenterProfile}
				captchaState={captchaState}
				captchaBusy={captchaBusy}
				bind:captchaValue
				captchaError={captchaError}
				captchaPrompt={captchaPrompt}
				noticeMessage={composerNoticeMessage}
				noticeTone={composerNoticeTone}
				replyParentId={activeReplyParentId}
				replyTarget={activeReplyTarget}
				submitting={submitting}
				onSubmit={handleSubmit}
				onCancelReply={handleCancelReply}
				onRefreshCaptcha={handleRefreshCaptcha}
			/>
		</div>
	</section>
{/if}
