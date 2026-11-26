<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getQingYanClient } from "@utils/qingyan/client";
import type { QingYanClientConfig } from "@utils/qingyan/contracts";
import { onMount } from "svelte";

export let postKey: string;
export let postTitle = "";
export let postUrl = "";
export let qingyan: QingYanClientConfig | null = null;

let pageViewCount: number | null = null;

onMount(() => {
	const client = getQingYanClient(qingyan);
	if (!client) {
		return;
	}

	void client
		.fetchPostEngagementBootstrap({
			pageKey: postKey,
			pageTitle: postTitle,
			pageUrl: postUrl,
		})
		.then((payload) => {
			pageViewCount = payload.pageMetrics.enabled
				? payload.pageMetrics.pageViewCount
				: null;
		})
		.catch(() => {
			pageViewCount = null;
		});
});
</script>

{#if pageViewCount !== null}
	<div class="optical-page-views optical-chip-static inline-flex items-center gap-1.5 min-h-7 px-3 py-1 rounded-lg text-xs font-medium ml-auto">
		<span class="optical-page-views-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">
				<path d="M2.6 12C4.9 7.8 8.3 5.8 12 5.8s7.1 2 9.4 6.2c-2.3 4.2-5.7 6.2-9.4 6.2S4.9 16.2 2.6 12Z" />
				<circle cx="12" cy="12" r="3.1" />
				<circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
			</svg>
		</span>
		<span class="text-muted">{i18n(I18nKey.pageViews)}</span>
		<span class="font-semibold tabular-nums text-90">{pageViewCount.toLocaleString()}</span>
	</div>
{/if}
