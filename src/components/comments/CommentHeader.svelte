<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

export let count = 0;
export let loading = false;
</script>

<div class="flex items-center justify-between gap-3 mb-4">
	<div>
		<h2 class="text-xl font-bold text-90">
			{i18n(I18nKey.comments)}
		</h2>
		<p class="text-sm text-50">
			{count}
			{count === 1 ? ` ${i18n(I18nKey.commentCountSingular)}` : ` ${i18n(I18nKey.commentCountPlural)}`}
		</p>
	</div>
	{#if loading}
		<p class="text-sm text-50">{i18n(I18nKey.commentsLoading)}</p>
	{/if}
</div>
