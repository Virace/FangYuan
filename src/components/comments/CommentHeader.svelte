<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export let count = 0;
export let loading = false;
</script>

<div class="flex flex-wrap items-center justify-between gap-3 mb-4">
	<div class="flex flex-wrap items-center gap-2.5">
		<span class="fy-brand-glyph-sm" aria-hidden="true"></span>
		<h2 class="text-lg font-bold text-90">
			{i18n(I18nKey.comments)}
		</h2>
		<span class="optical-chip-static inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono tabular-nums font-semibold text-accent-foreground">
			{count}
		</span>
		{#if loading}
			<span class="text-xs text-muted">{i18n(I18nKey.commentsLoading)}</span>
		{/if}
	</div>
	<slot name="actions" />
</div>
