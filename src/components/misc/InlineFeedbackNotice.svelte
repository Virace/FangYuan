<script lang="ts">
import type { AutoDismissTone } from "@utils/notice";
import { fade, slide } from "svelte/transition";

export let message = "";
export let tone: AutoDismissTone = "info";
export let compact = false;
export let duration = 180;

$: toneClass =
	tone === "success"
		? "bg-primary/10 text-primary"
		: tone === "error"
			? "bg-red-500/10 text-red-500"
			: "bg-soft-contrast text-60";

$: paddingClass = compact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm";
</script>

{#if message}
	<div class="overflow-hidden" transition:slide={{ duration }}>
		<p
			class={`rounded-xl leading-6 ${toneClass} ${paddingClass}`}
			in:fade={{ duration }}
			out:fade={{ duration }}
		>
			{message}
		</p>
	</div>
{/if}
