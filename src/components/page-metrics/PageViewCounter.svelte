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
	<div class="flex items-center text-sm text-muted">
		<div class="meta-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
				<path d="M2.25 12s3.75-6.5 9.75-6.5S21.75 12 21.75 12s-3.75 6.5-9.75 6.5S2.25 12 2.25 12Z" />
				<circle cx="12" cy="12" r="2.75" />
			</svg>
		</div>
		<span class="font-medium">{i18n(I18nKey.pageViews)}</span>
		<span class="ml-1.5 font-medium tabular-nums text-75">{pageViewCount}</span>
	</div>
{/if}
