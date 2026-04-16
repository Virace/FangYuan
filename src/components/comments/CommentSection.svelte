<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { ArtalkApiError } from "@utils/artalk/core";
import { getCommentClient } from "@utils/comments/client";
import {
	DEFAULT_COMMENT_SORT_BY,
	normalizeCommentOffset,
} from "@utils/comments/options";
import type {
	CommentCapability,
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
import { onDestroy, onMount, tick } from "svelte";
import { fade, slide } from "svelte/transition";
import type { CanonicalComment, CommentVoteChoice } from "@/types/comment";
import CommentComposer from "./CommentComposer.svelte";
import CommentHeader from "./CommentHeader.svelte";
import CommentList from "./CommentList.svelte";

const SUBMIT_NOTICE_TIMEOUT_MS = 6000;

type CommentComposerSubmitDetail = {
	authorName: string;
	authorEmail: string;
	authorWebsite: string;
	content: string;
};

const commentClient = getCommentClient();

type CaptchaTarget =
	| { kind: "composer" }
	| { kind: "comment"; commentId: string }
	| null;

export let postKey: string;
export let postTitle = "";
export let rootLimit = 5;
export let maxDepth = 3;

let capability: CommentCapability | null = null;
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
$: showComposerCaptcha =
	activeCaptchaTarget?.kind === "composer" && Boolean(captchaState?.required);
$: supportsVote = capability?.supportsVote ?? false;

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

function handleDismissCaptcha() {
	activeCaptchaTarget = null;
	captchaPrompt = "";
	captchaError = "";
}

function toCommentErrorMessage(error: unknown, fallbackKey: I18nKey): string {
	if (!(error instanceof Error)) {
		return i18n(fallbackKey);
	}

	if (error instanceof ArtalkApiError) {
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

async function promptForCaptcha(
	nextState: CommentCaptchaState | null,
	target: CaptchaTarget,
) {
	try {
		activeCaptchaTarget = target;
		captchaState =
			nextState ??
			(commentClient ? await commentClient.refreshCaptcha() : null);
		captchaPrompt = i18n(I18nKey.commentsCaptchaRequiredTip);
		captchaError = "";
		submitError = "";
		submitNotice = "";
		await revealCaptchaTarget(target);
	} catch (error) {
		logCommentError("prepare captcha prompt failed", error);
		submitError = toCommentErrorMessage(error, I18nKey.commentsLoadFailed);
	}
}

async function loadComments(nextOptions?: {
	sortBy?: CommentSortBy;
	offset?: number;
}) {
	loading = true;
	loadError = "";

	try {
		if (!commentClient) {
			capability = null;
			comments = [];
			captchaState = null;
			return;
		}

		const nextSortBy = nextOptions?.sortBy ?? currentSortBy;
		const nextOffset = normalizeCommentOffset(
			nextOptions?.offset ?? currentOffset,
		);
		const [nextCapability, threadPage] = await Promise.all([
			commentClient.getCapability(postKey),
			commentClient.getThread({
				postKey,
				sortBy: nextSortBy,
				limit: pageSize,
				offset: nextOffset,
			}),
		]);

		capability = nextCapability;
		if (!nextCapability.enabled) {
			comments = [];
			totalRootCount = 0;
			captchaState = null;
			return;
		}

		currentSortBy = threadPage.sortBy;
		currentOffset = threadPage.offset;
		totalRootCount = threadPage.rootsCount;
		comments = threadPage.comments;

		if (!captchaState) {
			captchaState = await commentClient.getCaptchaState();
		}
	} catch (error) {
		logCommentError("load comments failed", error);
		loadError = toCommentErrorMessage(error, I18nKey.commentsLoadFailed);
	} finally {
		loading = false;
	}
}

function handleReply(commentId: string) {
	activeReplyParentId = activeReplyParentId === commentId ? null : commentId;
	submitError = "";
	submitNotice = "";
}

function handleCancelReply() {
	activeReplyParentId = null;
}

async function handleRefreshCaptcha() {
	captchaBusy = true;
	captchaError = "";

	try {
		if (!commentClient) {
			return;
		}

		captchaState = await commentClient.refreshCaptcha();
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
		if (!commentClient) {
			return;
		}

		captchaState = await commentClient.verifyCaptcha(input);
		if (!captchaState.verified) {
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

async function handleSortChange(sortBy: CommentSortBy) {
	if (sortBy === currentSortBy) {
		return;
	}

	activeReplyParentId = null;
	activeCaptchaTarget = null;
	submitError = "";
	submitNotice = "";
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
	submitError = "";
	submitNotice = "";
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
	let voteUp = comment.voteUp;
	let voteDown = comment.voteDown;

	if (comment.viewerVote === "up" && choice !== "up") {
		voteUp = Math.max(0, voteUp - 1);
	}

	if (comment.viewerVote === "down" && choice !== "down") {
		voteDown = Math.max(0, voteDown - 1);
	}

	if (comment.viewerVote !== choice) {
		if (choice === "up") {
			voteUp += 1;
		} else {
			voteDown += 1;
		}
	}

	return {
		...comment,
		voteUp,
		voteDown,
		viewerVote: choice,
	};
}

async function handleSubmit(detail: CommentComposerSubmitDetail) {
	submitting = true;
	submitError = "";
	submitNotice = "";

	try {
		if (!commentClient) {
			return;
		}

		const createdComment = await commentClient.createComment({
			postKey,
			postTitle,
			parentId: activeReplyParentId,
			author: {
				name: detail.authorName,
				email: detail.authorEmail,
				website: detail.authorWebsite || null,
			},
			content: detail.content,
			captcha: null,
		});

		comments = insertPendingComment(comments, createdComment);
		activeReplyParentId = null;
		activeCaptchaTarget = null;
		captchaError = "";
		captchaPrompt = "";
		try {
			captchaState = await commentClient.getCaptchaState();
		} catch (error) {
			logCommentError("refresh captcha state after submit failed", error);
		}
		setTransientSubmitNotice(
			createdComment.status === "approved"
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
			if (commentClient && !captchaState?.required) {
				captchaState = await commentClient.getCaptchaState();
			}
		} catch {
			// ignore captcha refresh failures after submit errors
		}
		return false;
	} finally {
		submitting = false;
	}
}

async function handleVote(commentId: string, choice: CommentVoteChoice) {
	if (!commentClient || !capability?.supportsVote) {
		return;
	}

	const previousComment = getCommentById(comments, commentId);
	if (!previousComment) {
		return;
	}

	submitError = "";
	submitNotice = "";
	comments = replaceCommentInTree(
		comments,
		buildOptimisticVoteComment(previousComment, choice),
	);

	try {
		const updatedComment = await commentClient.voteComment({
			commentId,
			choice,
		});
		comments = replaceCommentInTree(comments, updatedComment);
		activeCaptchaTarget = null;
		if (captchaState?.required) {
			try {
				captchaState = await commentClient.getCaptchaState();
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
	}
}

onMount(() => {
	void loadComments();
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
					class="link-underline"
					class:text-primary={currentSortBy === "date_desc"}
					on:click={() => void handleSortChange("date_desc")}
				>
					{i18n(I18nKey.commentsSortNewest)}
				</button>
				<button
					type="button"
					class="link-underline"
					class:text-primary={currentSortBy === "date_asc"}
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

	<div class="mt-5">
		{#if !loading && comments.length === 0 && capability?.enabled}
			<p class="text-sm text-50">{i18n(I18nKey.commentsEmpty)}</p>
		{:else if comments.length > 0}
			<CommentList
				comments={comments}
				activeReplyParentId={activeReplyParentId}
				activeCaptchaCommentId={activeCaptchaCommentId}
				maxDepth={maxDepth}
				supportsVote={supportsVote}
				captchaState={captchaState}
				captchaBusy={captchaBusy}
				captchaError={captchaError}
				captchaPrompt={captchaPrompt}
				onVote={handleVote}
				onReply={handleReply}
				onDismissCaptcha={handleDismissCaptcha}
				onRefreshCaptcha={handleRefreshCaptcha}
				onVerifyCaptcha={handleVerifyCaptcha}
			/>
		{/if}
	</div>

	<div class="mt-6">
		{#if submitNotice}
			<div transition:slide={{ duration: 180 }}>
				<p
					class="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary"
					in:fade={{ duration: 180 }}
					out:fade={{ duration: 180 }}
				>
					{submitNotice}
				</p>
			</div>
		{/if}

		<CommentComposer
			showCaptcha={showComposerCaptcha}
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
			onVerifyCaptcha={handleVerifyCaptcha}
		/>
	</div>
</section>
