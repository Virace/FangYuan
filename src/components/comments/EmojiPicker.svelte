<script lang="ts">
import { COMMENT_EMOJIS } from "@constants/comment-emojis";

export let onSelect: ((emoji: string) => void) | null = null;
</script>

<div class="comment-emoji-grid">
	{#each COMMENT_EMOJIS as emoji}
		<button
			type="button"
			class="comment-action comment-emoji-cell text-base"
			on:click={() => onSelect?.(emoji)}
		>
			{emoji}
		</button>
	{/each}
</div>
