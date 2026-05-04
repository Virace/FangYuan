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
			pageViewCount = payload.pageMetrics.pageViewCount;
		})
		.catch(() => {
			pageViewCount = null;
		});
});
</script>

{#if pageViewCount !== null}
	<div class="flex items-center gap-2 text-sm text-50">
		<span aria-hidden="true">👀</span>
		<span>{i18n(I18nKey.pageViews)}</span>
		<span class="text-75">{pageViewCount}</span>
	</div>
{/if}
