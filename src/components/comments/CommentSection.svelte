<script lang="ts">
import type { CanonicalComment, CommentVoteChoice } from "@/types/comment";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCommentClient } from "@utils/comments/client";
import { insertPendingComment, replaceCommentInTree } from "@utils/comments/tree";
import type { CommentCapability } from "@utils/comments/provider";
import { onMount } from "svelte";
import CommentComposer from "./CommentComposer.svelte";
import CommentHeader from "./CommentHeader.svelte";
import CommentList from "./CommentList.svelte";

type ComposerSubmitEvent = CustomEvent<{
	authorName: string;
	authorEmail: string;
	authorWebsite: string;
	content: string;
}>;

const commentClient = getCommentClient();

export let postKey: string;
export let postTitle = "";
export let rootLimit = 5;
export let maxDepth = 3;

let capability: CommentCapability | null = null;
let comments: CanonicalComment[] = [];
let loading = true;
let submitting = false;
let loadError = "";
let submitError = "";
let submitNotice = "";
let activeReplyParentId: string | null = null;

$: visibleComments = comments.slice(0, rootLimit);
$: supportsVote = capability?.supportsVote ?? false;

async function loadComments() {
	loading = true;
	loadError = "";

	try {
		if (!commentClient) {
			capability = null;
			comments = [];
			return;
		}

		capability = await commentClient.getCapability(postKey);
		if (!capability.enabled) {
			comments = [];
			return;
		}

		comments = await commentClient.getThread(postKey);
	} catch (error) {
		loadError =
			error instanceof Error ? error.message : i18n(I18nKey.commentsLoadFailed);
	} finally {
		loading = false;
	}
}

function handleReply(event: CustomEvent<string>) {
	activeReplyParentId = activeReplyParentId === event.detail ? null : event.detail;
	submitError = "";
	submitNotice = "";
}

function handleCancelReply() {
	activeReplyParentId = null;
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

async function handleSubmit(event: ComposerSubmitEvent) {
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
				name: event.detail.authorName,
				email: event.detail.authorEmail,
				website: event.detail.authorWebsite || null,
			},
			content: event.detail.content,
		});

		comments = insertPendingComment(comments, createdComment);
		activeReplyParentId = null;
		submitNotice =
			createdComment.status === "approved"
				? i18n(I18nKey.commentsSubmitSuccess)
				: i18n(I18nKey.commentsModerationNotice);
	} catch (error) {
		submitError =
			error instanceof Error ? error.message : i18n(I18nKey.commentsLoadFailed);
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
		const updatedComment = await commentClient.voteComment({ commentId, choice });
		comments = replaceCommentInTree(comments, updatedComment);
	} catch (error) {
		comments = replaceCommentInTree(comments, previousComment);
		submitError =
			error instanceof Error ? error.message : i18n(I18nKey.commentsLoadFailed);
	}
}

onMount(() => {
	void loadComments();
});
</script>

<section
	class="card-base mt-4 px-6 md:px-9 pt-6 pb-6 relative w-full"
	data-post-title={postTitle}
>
	<CommentHeader count={visibleComments.length} loading={loading} />

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

	{#if submitNotice}
		<p class="mb-4 rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
			{submitNotice}
		</p>
	{/if}

	<div class="mt-5">
		{#if !loading && visibleComments.length === 0 && capability?.enabled}
			<p class="text-sm text-50">{i18n(I18nKey.commentsEmpty)}</p>
		{:else if visibleComments.length > 0}
			<CommentList
				comments={visibleComments}
				activeReplyParentId={activeReplyParentId}
				maxDepth={maxDepth}
				supportsVote={supportsVote}
				onVote={handleVote}
				on:reply={handleReply}
			/>
		{/if}
	</div>

	<div class="mt-6">
		<CommentComposer
			replyParentId={activeReplyParentId}
			submitting={submitting}
			on:submit={handleSubmit}
			on:cancelReply={handleCancelReply}
		/>
	</div>
</section>
