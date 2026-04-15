<script lang="ts">
import { COMMENT_EMOJIS } from "@constants/comment-emojis";
import { createEventDispatcher } from "svelte";

const dispatch = createEventDispatcher<{
	select: string;
}>();
</script>

<div class="flex flex-wrap gap-2">
	{#each COMMENT_EMOJIS as emoji}
		<button
			type="button"
			class="btn-plain rounded-lg px-2 h-8 text-base"
			on:click={() => dispatch("select", emoji)}
		>
			{emoji}
		</button>
	{/each}
</div>
