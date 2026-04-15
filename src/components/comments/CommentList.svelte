<script lang="ts">
import type { CanonicalComment } from "@/types/comment";
import { createEventDispatcher } from "svelte";
import CommentItem from "./CommentItem.svelte";

const dispatch = createEventDispatcher<{ reply: string }>();

export let comments: CanonicalComment[] = [];
export let activeReplyParentId: string | null = null;
export let maxDepth = 3;
export let supportsVote = false;
export let onVote: ((commentId: string, choice: "up" | "down") => void) | null = null;

function forwardReply(event: CustomEvent<string>) {
	dispatch("reply", event.detail);
}
</script>

<div class="space-y-3">
	{#each comments as comment (comment.id)}
		<CommentItem
			comment={comment}
			activeReplyParentId={activeReplyParentId}
			depth={1}
			maxDepth={maxDepth}
			supportsVote={supportsVote}
			onVote={onVote}
			on:reply={forwardReply}
		/>
	{/each}
</div>
