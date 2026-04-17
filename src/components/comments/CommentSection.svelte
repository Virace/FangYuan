<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import {
	DEFAULT_COMMENT_SORT_BY,
	normalizeCommentOffset,
} from "@utils/comments/options";
import type {
	CommentCapability,
	CommentForm,
	CommentCaptchaState,
	VerifyCommentCaptchaInput,
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
import { onDestroy, onMount, tick } from "svelte";
import { fade, slide } from "svelte/transition";
import type { CanonicalComment, CommentVoteChoice } from "@/types/comment";
import CommentComposer from "./CommentComposer.svelte";
import CommentHeader from "./CommentHeader.svelte";
import CommentList from "./CommentList.svelte";

const SUBMIT_NOTICE_TIMEOUT_MS = 6000;
const contentTransitionDuration = 180;

type CommentComposerSubmitDetail = {
	authorName: string;
	authorEmail: string;
	authorWebsite: string;
	content: string;
};

type CaptchaTarget =
	| { kind: "composer" }
	| { kind: "comment"; commentId: string }
	| null;

type VoteConfirmTarget = {
	commentId: string;
	choice: CommentVoteChoice;
} | null;

const qingyanClient = getQingYanClient();

export let postKey: string;
export let postTitle = "";
export let postUrl = "";
export let rootLimit = 5;
export let maxDepth = 3;

let capability: CommentCapability | null = null;
let commentForm: CommentForm | null = null;
let comments: CanonicalComment[] = [];
let loading = true;
let submitting = false;
let captchaBusy = false;
let loadError = "";
let submitError = "";
let submitNotice = "";
let captchaError = "";
let captchaPrompt = "";
let activeReplyParentId: string | null = null;
let captchaState: CommentCaptchaState | null = null;
let activeCaptchaTarget: CaptchaTarget = null;
let currentSortBy: CommentSortBy = DEFAULT_COMMENT_SORT_BY;
let currentOffset = 0;
let totalRootCount = 0;
let submitNoticeTimer: ReturnType<typeof setTimeout> | null = null;
let voteBusyCommentId: string | null = null;
let pendingVoteTarget: VoteConfirmTarget = null;

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
$: activeVoteConfirmCommentId = pendingVoteTarget?.commentId ?? null;
$: pendingVoteChoice = pendingVoteTarget?.choice ?? null;
$: supportsVote = capability?.supportsVote ?? false;
$: supportsCaptcha = capability?.supportsCaptcha ?? false;
$: persistenceMode = capability?.persistenceMode ?? "persistent";
$: allowedFields = commentForm?.allow ?? ["nickname", "email", "website"];
$: requiredFields = commentForm?.require ?? ["nickname", "email"];
$: showComposerCaptcha =
	supportsCaptcha &&
	activeCaptchaTarget?.kind === "composer" &&
	Boolean(captchaState?.required);
$: showCommentLoadingOverlay = loading && comments.length > 0;
$: showCommentInitialSkeleton = loading && comments.length === 0;
$: showCommentEmptyState =
	!loading && comments.length === 0 && capability?.enabled;

function logCommentError(context: string, error: unknown) {
	console.error(`[comments] ${context}`, error);
}

function setTransientSubmitNotice(message: string) {
	submitNotice = message;
	if (submitNoticeTimer) {
		clearTimeout(submitNoticeTimer);
	}
	submitNoticeTimer = setTimeout(() => {
		submitNotice = "";
	}, SUBMIT_NOTICE_TIMEOUT_MS);
}

function clearVoteTransientState() {
	pendingVoteTarget = null;
	submitError = "";
	submitNotice = "";
}

function handleDismissCaptcha() {
	activeCaptchaTarget = null;
	captchaPrompt = "";
	captchaError = "";
}

function handleCancelVoteConfirm() {
	pendingVoteTarget = null;
}

function toCommentErrorMessage(error: unknown, fallbackKey: I18nKey): string {
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
	comments = applyPersistedViewerVotes(postKey, payload.comments);
	currentSortBy = payload.pagination.sortBy;
	currentOffset = payload.pagination.offset;
	totalRootCount = payload.pagination.rootCount;
	captchaState = payload.captcha;
	loadError = "";
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
		captchaState =
			nextState ??
			(qingyanClient
				? await qingyanClient.refreshCaptcha({
						pageKey: postKey,
						pageTitle: postTitle,
						pageUrl: postUrl,
					})
				: null);
		captchaPrompt = i18n(I18nKey.commentsCaptchaRequiredTip);
		captchaError = "";
		clearVoteTransientState();
		await revealCaptchaTarget(target);
	} catch (error) {
		logCommentError("prepare captcha prompt failed", error);
		submitError = toCommentErrorMessage(error, I18nKey.commentsLoadFailed);
	}
}

async function loadInitialState() {
	loading = true;
	loadError = "";

	try {
		if (!qingyanClient) {
			capability = null;
			commentForm = null;
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
		if (!bootstrap.capability.enabled) {
			comments = [];
			totalRootCount = 0;
			captchaState = null;
			activeCaptchaTarget = null;
			captchaPrompt = "";
			captchaError = "";
		}
	} catch (error) {
		logCommentError("load comments failed", error);
		loadError = toCommentErrorMessage(error, I18nKey.commentsLoadFailed);
	} finally {
		loading = false;
	}
}

async function loadComments(nextOptions?: {
	sortBy?: CommentSortBy;
	offset?: number;
}) {
	loading = true;
	loadError = "";

	try {
		if (!qingyanClient) {
			capability = null;
			commentForm = null;
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
		loadError = toCommentErrorMessage(error, I18nKey.commentsLoadFailed);
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
	} catch (error) {
		logCommentError("refresh captcha failed", error);
		captchaError = toCommentErrorMessage(error, I18nKey.commentsLoadFailed);
	} finally {
		captchaBusy = false;
	}
}

async function handleVerifyCaptcha(input: VerifyCommentCaptchaInput) {
	captchaBusy = true;
	captchaError = "";

	try {
		if (!qingyanClient || !supportsCaptcha) {
			return;
		}

		captchaState = await qingyanClient.verifyCaptcha({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
			captchaState,
			verification: input,
		});
		if (!captchaState?.verified) {
			captchaError = i18n(I18nKey.commentsCaptchaVerifyFailed);
		} else {
			captchaPrompt = "";
		}
	} catch (error) {
		logCommentError("verify captcha failed", error);
		captchaError = toCommentErrorMessage(
			error,
			I18nKey.commentsCaptchaVerifyFailed,
		);
	} finally {
		captchaBusy = false;
	}
}

async function handlePollCaptchaStatus() {
	if (!qingyanClient || !supportsCaptcha || !activeCaptchaTarget) {
		return;
	}

	try {
		const nextStatus = await qingyanClient.getCaptchaStatus({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
		});
		if (!nextStatus?.verified) {
			return;
		}

		captchaState = captchaState
			? {
					...captchaState,
					required: true,
					verified: true,
				}
			: {
					...nextStatus,
					required: true,
				};
		captchaPrompt = "";
		captchaError = "";
	} catch (error) {
		logCommentError("poll captcha status failed", error);
		captchaError = toCommentErrorMessage(
			error,
			I18nKey.commentsCaptchaVerifyFailed,
		);
	}
}

async function handleSortChange(sortBy: CommentSortBy) {
	if (sortBy === currentSortBy) {
		return;
	}

	activeReplyParentId = null;
	activeCaptchaTarget = null;
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
	activeCaptchaTarget = null;
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

function buildOptimisticVoteComment(
	comment: CanonicalComment,
	choice: CommentVoteChoice,
): CanonicalComment {
	return {
		...comment,
		voteUp: comment.voteUp + (choice === "up" ? 1 : 0),
		voteDown: comment.voteDown + (choice === "down" ? 1 : 0),
		viewerVote: choice,
	};
}

function requestVoteConfirm(commentId: string, choice: CommentVoteChoice) {
	activeCaptchaTarget = null;
	captchaPrompt = "";
	captchaError = "";
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

		const result = await qingyanClient.createComment({
			postKey,
			postTitle,
			pageUrl: postUrl,
			parentId: activeReplyParentId,
			author: {
				name: detail.authorName,
				email: detail.authorEmail,
				website: detail.authorWebsite || null,
			},
			content: detail.content,
			captcha: null,
		});

		comments = insertPendingComment(comments, result.createdComment);
		totalRootCount = result.thread.rootCommentCount;
		activeReplyParentId = null;
		activeCaptchaTarget = null;
		captchaError = "";
		captchaPrompt = "";
		qingyanClient.invalidateBootstrap(postKey);
		if (supportsCaptcha) {
			try {
				captchaState = await qingyanClient.getCaptchaState({
					pageKey: postKey,
					pageTitle: postTitle,
					pageUrl: postUrl,
				});
			} catch (error) {
				logCommentError("refresh captcha state after submit failed", error);
			}
		} else {
			captchaState = null;
		}
		setTransientSubmitNotice(
			result.comment.status === "approved"
				? i18n(I18nKey.commentsSubmitSuccess)
				: i18n(I18nKey.commentsModerationNotice),
		);
		return true;
	} catch (error) {
		if (error instanceof CommentCaptchaRequiredError) {
			await promptForCaptcha(error.state, { kind: "composer" });
		} else {
			logCommentError("submit comment failed", error);
			submitError = toCommentErrorMessage(error, I18nKey.commentsSubmitFailed);
		}

		try {
			if (qingyanClient && supportsCaptcha && !captchaState?.required) {
				captchaState = await qingyanClient.getCaptchaState({
					pageKey: postKey,
					pageTitle: postTitle,
					pageUrl: postUrl,
				});
			}
		} catch {
			// ignore captcha refresh failures after submit errors
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

	voteBusyCommentId = commentId;
	clearVoteTransientState();
	comments = replaceCommentInTree(
		comments,
		buildOptimisticVoteComment(previousComment, choice),
	);

	try {
		const updatedVote = await qingyanClient.voteComment({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
			commentId,
			choice,
		});
		comments = replaceCommentInTree(comments, {
			...previousComment,
			voteUp: updatedVote.voteUp,
			voteDown: updatedVote.voteDown,
			viewerVote: updatedVote.viewerVote ?? choice,
		});
		persistViewerVote(postKey, commentId, updatedVote.viewerVote ?? choice);
		qingyanClient.invalidateBootstrap(postKey);
		activeCaptchaTarget = null;
		if (supportsCaptcha && captchaState?.required) {
			try {
				captchaState = await qingyanClient.getCaptchaState({
					pageKey: postKey,
					pageTitle: postTitle,
					pageUrl: postUrl,
				});
			} catch (error) {
				logCommentError("refresh captcha state after vote failed", error);
			}
			captchaPrompt = "";
			captchaError = "";
		}
	} catch (error) {
		comments = replaceCommentInTree(comments, previousComment);
		if (error instanceof CommentCaptchaRequiredError) {
			await promptForCaptcha(error.state, {
				kind: "comment",
				commentId,
			});
		} else {
			logCommentError("vote comment failed", error);
			submitError = toCommentErrorMessage(error, I18nKey.commentsVoteFailed);
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
	if (submitNoticeTimer) {
		clearTimeout(submitNoticeTimer);
	}
});
</script>

<section
	class="card-base mt-4 px-6 md:px-9 pt-6 pb-6 relative w-full"
	data-post-title={postTitle}
>
	<CommentHeader count={countCommentsInTree(comments)} loading={loading} />

	{#if capability && !capability.enabled}
		<p class="mb-4 text-sm text-50">
			{capability.message || i18n(I18nKey.commentsDisabled)}
		</p>
	{/if}

	{#if loadError}
		<p class="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
			{loadError || i18n(I18nKey.commentsLoadFailed)}
		</p>
	{/if}

	{#if submitError}
		<p class="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500">
			{submitError}
		</p>
	{/if}

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
					activeVoteConfirmCommentId={activeVoteConfirmCommentId}
					maxDepth={maxDepth}
					supportsVote={supportsVote}
					voteBusy={Boolean(voteBusyCommentId)}
					pendingVoteChoice={pendingVoteChoice}
					captchaState={captchaState}
					captchaBusy={captchaBusy}
					captchaError={captchaError}
					captchaPrompt={captchaPrompt}
					onVote={handleVote}
					onConfirmVote={handleConfirmVote}
					onCancelVoteConfirm={handleCancelVoteConfirm}
					onReply={handleReply}
					onDismissCaptcha={handleDismissCaptcha}
					onRefreshCaptcha={handleRefreshCaptcha}
					onPollCaptchaStatus={handlePollCaptchaStatus}
					onVerifyCaptcha={handleVerifyCaptcha}
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
		{#if submitNotice}
			<div transition:slide={{ duration: contentTransitionDuration }}>
				<p
					class="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary"
					in:fade={{ duration: contentTransitionDuration }}
					out:fade={{ duration: contentTransitionDuration }}
				>
					{submitNotice}
				</p>
			</div>
		{/if}

		<CommentComposer
			showCaptcha={showComposerCaptcha}
			allowedFields={allowedFields}
			requiredFields={requiredFields}
			persistenceMode={persistenceMode}
			captchaState={captchaState}
			captchaBusy={captchaBusy}
			captchaError={captchaError}
			captchaPrompt={captchaPrompt}
			replyParentId={activeReplyParentId}
			submitting={submitting}
			onSubmit={handleSubmit}
			onDismissCaptcha={handleDismissCaptcha}
			onCancelReply={handleCancelReply}
			onRefreshCaptcha={handleRefreshCaptcha}
			onPollCaptchaStatus={handlePollCaptchaStatus}
			onVerifyCaptcha={handleVerifyCaptcha}
		/>
	</div>
</section>
