<script lang="ts">
import type { CanonicalComment } from "@/types/comment";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { createEventDispatcher } from "svelte";

const dispatch = createEventDispatcher<{ reply: string }>();

export let comment: CanonicalComment;
export let activeReplyParentId: string | null = null;
export let depth = 1;
export let maxDepth = 3;
export let supportsVote = false;
export let onVote: ((commentId: string, choice: "up" | "down") => void) | null = null;

function formatCommentDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return value;
	}

	return date.toLocaleString();
}

function triggerReply() {
	dispatch("reply", comment.id);
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
				<div class="mt-3 flex flex-wrap items-center gap-2">
					<button
						class="btn-plain rounded-lg px-3 h-8 text-sm"
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
							class={`btn-plain rounded-lg px-3 h-8 text-sm ${comment.viewerVote === "up" ? "bg-primary/10 text-primary" : ""}`}
							aria-label={i18n(I18nKey.commentsVoteUp)}
							on:click={() => onVote?.(comment.id, "up")}
						>
							<span aria-hidden="true">👍</span>
							<span class="ml-1">{comment.voteUp}</span>
						</button>
						<button
							type="button"
							class={`btn-plain rounded-lg px-3 h-8 text-sm ${comment.viewerVote === "down" ? "bg-primary/10 text-primary" : ""}`}
							aria-label={i18n(I18nKey.commentsVoteDown)}
							on:click={() => onVote?.(comment.id, "down")}
						>
							<span aria-hidden="true">👎</span>
							<span class="ml-1">{comment.voteDown}</span>
						</button>
					{/if}
				</div>
			{/if}

			{#if depth < maxDepth && comment.children.length > 0}
				<div class="comment-children mt-4 space-y-3">
					{#each comment.children as child (child.id)}
						<svelte:self
							comment={child}
							activeReplyParentId={activeReplyParentId}
							depth={depth + 1}
							maxDepth={maxDepth}
							supportsVote={supportsVote}
							onVote={onVote}
							on:reply
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</article>
