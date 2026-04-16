<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import type {
	CommentCaptchaState,
	VerifyCommentCaptchaInput,
} from "@utils/comments/provider";
import { slide } from "svelte/transition";
import type { CanonicalComment } from "@/types/comment";
import InlineCommentCaptcha from "./InlineCommentCaptcha.svelte";

export let comment: CanonicalComment;
export let activeReplyParentId: string | null = null;
export let activeCaptchaCommentId: string | null = null;
export let depth = 1;
export let maxDepth = 3;
export let supportsVote = false;
export let captchaState: CommentCaptchaState | null = null;
export let captchaBusy = false;
export let captchaError = "";
export let captchaPrompt = "";
export let onVote: ((commentId: string, choice: "up" | "down") => void) | null =
	null;
export let onReply: ((commentId: string) => void) | null = null;
export let onDismissCaptcha: (() => void) | null = null;
export let onRefreshCaptcha: (() => void | Promise<void>) | null = null;
export let onVerifyCaptcha:
	| ((input: VerifyCommentCaptchaInput) => void | Promise<void>)
	| null = null;

function formatCommentDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
}

function triggerReply() {
	onReply?.(comment.id);
}
</script>

<article
	class="comment-item"
	class:comment-root={depth === 1}
	class:comment-nested={depth > 1}
>
	<div class="flex items-start gap-3">
		{#if comment.author.avatarUrl}
			<img
				alt={comment.author.name}
				class="h-10 w-10 rounded-full object-cover"
				src={comment.author.avatarUrl}
			/>
		{:else}
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-btn-plain-bg-hover text-sm font-semibold text-primary">
				{comment.author.name.slice(0, 1).toUpperCase()}
			</div>
		{/if}

		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
				<span class="font-semibold text-90">{comment.author.name}</span>
				<span class="text-xs text-50">{formatCommentDate(comment.createdAt)}</span>
				{#if comment.status !== "approved"}
					<span class="rounded-full bg-soft-contrast px-2 py-0.5 text-xs text-50">
						{i18n(I18nKey.commentsModerationNotice)}
					</span>
				{/if}
			</div>

			<div class="comment-body mt-2 text-sm leading-7 text-75">
				{@html comment.content.html}
			</div>

			{#if depth < maxDepth || supportsVote}
				<div class="comment-actions mt-3">
					<button
						class="comment-action"
						class:comment-action-active={activeReplyParentId === comment.id}
						type="button"
						on:click={triggerReply}
					>
						{activeReplyParentId === comment.id
							? i18n(I18nKey.commentsCancelReply)
							: i18n(I18nKey.commentsReply)}
					</button>

					{#if supportsVote}
						<button
							type="button"
							class="comment-action"
							class:comment-action-active={comment.viewerVote === "up"}
							aria-label={i18n(I18nKey.commentsVoteUp)}
							on:click={() => onVote?.(comment.id, "up")}
						>
							<span aria-hidden="true">👍</span>
							<span class="comment-action-count">{comment.voteUp}</span>
						</button>
						<button
							type="button"
							class="comment-action"
							class:comment-action-active={comment.viewerVote === "down"}
							aria-label={i18n(I18nKey.commentsVoteDown)}
							on:click={() => onVote?.(comment.id, "down")}
						>
							<span aria-hidden="true">👎</span>
							<span class="comment-action-count">{comment.voteDown}</span>
						</button>
					{/if}
				</div>
			{/if}

			{#if comment.id === activeCaptchaCommentId && captchaState?.required}
				<div
					class="mt-3"
					data-comment-captcha-target={comment.id}
					transition:slide={{ duration: 180 }}
				>
					<InlineCommentCaptcha
						compact={true}
						captchaBusy={captchaBusy}
						captchaError={captchaError}
						captchaPrompt={captchaPrompt}
						captchaState={captchaState}
						onDismiss={onDismissCaptcha}
						onRefreshCaptcha={onRefreshCaptcha}
						onVerifyCaptcha={onVerifyCaptcha}
					/>
				</div>
			{/if}

			{#if depth < maxDepth && comment.children.length > 0}
				<div class="comment-children mt-4 space-y-3">
					{#each comment.children as child (child.id)}
						<svelte:self
							comment={child}
							activeReplyParentId={activeReplyParentId}
							activeCaptchaCommentId={activeCaptchaCommentId}
							depth={depth + 1}
							maxDepth={maxDepth}
							supportsVote={supportsVote}
							captchaState={captchaState}
							captchaBusy={captchaBusy}
							captchaError={captchaError}
							captchaPrompt={captchaPrompt}
							onVote={onVote}
							onReply={onReply}
							onRefreshCaptcha={onRefreshCaptcha}
							onVerifyCaptcha={onVerifyCaptcha}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</article>
