<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getPageMetricsClient } from "@utils/page-metrics/client";
import { onMount } from "svelte";

export let postKey: string;
export let postTitle = "";

let pv: number | null = null;

onMount(() => {
	const client = getPageMetricsClient();
	if (!client) {
		return;
	}

	void client
		.recordPageView({ postKey, postTitle })
		.then((metrics) => {
			pv = metrics.pv;
		})
		.catch(() => {
			pv = null;
		});
});
</script>

{#if pv !== null}
	<div class="flex items-center gap-2 text-sm text-50">
		<span aria-hidden="true">👀</span>
		<span>{i18n(I18nKey.pageViews)}</span>
		<span class="text-75">{pv}</span>
	</div>
{/if}
