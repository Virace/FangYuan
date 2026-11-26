<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { url } from "@utils/permalink/urls.ts";
import { onMount } from "svelte";
import { siteConfig } from "@/config";
import type { SearchResult } from "@/global";

let keywordDesktop = "";
let keywordMobile = "";
let result: SearchResult[] = [];
let isSearching = false;
let pagefindLoaded = false;
let initialized = false;
const isZhLocale = siteConfig.lang.toLowerCase().startsWith("zh");
const emptySearchTitle = isZhLocale ? "未找到匹配内容" : "No matching results";
const emptySearchHint = isZhLocale
	? "换一个关键词，或尝试更短的词组。"
	: "Try a different keyword or a shorter phrase.";
const clearSearchLabel = isZhLocale ? "清空搜索" : "Clear search";

const fakeResult: SearchResult[] = [
	{
		url: url("/"),
		meta: {
			title: "This Is a Fake Search Result",
		},
		excerpt:
			"Because the search cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: url("/"),
		meta: {
			title: "If You Want to Test the Search",
		},
		excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
	},
];

const togglePanel = () => {
	const panel = document.getElementById("search-panel");
	panel?.classList.toggle("float-panel-closed");
};

const closePanel = () => {
	const panel = document.getElementById("search-panel");
	panel?.classList.add("float-panel-closed");
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	const panel = document.getElementById("search-panel");
	if (!panel || !isDesktop) return;

	if (show) {
		panel.classList.remove("float-panel-closed");
	} else {
		panel.classList.add("float-panel-closed");
	}
};

const search = async (keyword: string, isDesktop: boolean): Promise<void> => {
	const trimmed = keyword.trim();
	if (!trimmed) {
		setPanelVisibility(false, isDesktop);
		result = [];
		return;
	}

	if (!initialized) {
		return;
	}

	isSearching = true;

	try {
		let searchResults: SearchResult[] = [];

		if (import.meta.env.PROD && pagefindLoaded && window.pagefind) {
			const response = await window.pagefind.search(trimmed);
			searchResults = await Promise.all(
				response.results.map((item) => item.data()),
			);
		} else if (import.meta.env.DEV) {
			searchResults = fakeResult;
		} else {
			searchResults = [];
			console.error("Pagefind is not available in production environment.");
		}

		result = searchResults;
		setPanelVisibility(true, isDesktop);
	} catch (error) {
		console.error("Search error:", error);
		result = [];
		setPanelVisibility(false, isDesktop);
	} finally {
		isSearching = false;
	}
};

const clearDesktopKeyword = () => {
	keywordDesktop = "";
	result = [];
	setPanelVisibility(false, true);
};

const clearMobileKeyword = () => {
	keywordMobile = "";
	result = [];
};

const handleInputKeydown = (event: KeyboardEvent) => {
	if (event.key === "Escape") {
		closePanel();
	}
};

onMount(() => {
	const initializeSearch = () => {
		initialized = true;
		pagefindLoaded =
			typeof window !== "undefined" &&
			!!window.pagefind &&
			typeof window.pagefind.search === "function";
		console.log("Pagefind status on init:", pagefindLoaded);
		if (keywordDesktop) search(keywordDesktop, true);
		if (keywordMobile) search(keywordMobile, false);
	};

	if (import.meta.env.DEV) {
		console.log(
			"Pagefind is not available in development mode. Using mock data.",
		);
		initializeSearch();
	} else {
		document.addEventListener("pagefindready", () => {
			console.log("Pagefind ready event received.");
			initializeSearch();
		});
		document.addEventListener("pagefindloaderror", () => {
			console.warn(
				"Pagefind load error event received. Search functionality will be limited.",
			);
			initializeSearch(); // Initialize with pagefindLoaded as false
		});

		// Fallback in case events are not caught or pagefind is already loaded by the time this script runs
		setTimeout(() => {
			if (!initialized) {
				console.log("Fallback: Initializing search after timeout.");
				initializeSearch();
			}
		}, 2000); // Adjust timeout as needed
	}
});

$: if (initialized && keywordDesktop !== undefined) {
	void search(keywordDesktop, true);
}

$: if (initialized && keywordMobile !== undefined) {
	void search(keywordMobile, false);
}

$: hasActiveKeyword = Boolean(keywordDesktop.trim() || keywordMobile.trim());
</script>

<!-- search bar for desktop view -->
<div id="search-bar" class="search-field-shell relative hidden lg:flex items-center h-11 mr-2 rounded-lg">
    <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" class="absolute text-xl pointer-events-none ml-3 transition my-auto text-30"><path fill="currentColor" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/></svg>
    <input
           aria-label={i18n(I18nKey.search)}
           placeholder="{i18n(I18nKey.search)}"
           bind:value={keywordDesktop}
           on:focus={() => search(keywordDesktop, true)}
           on:keydown={handleInputKeydown}
           class={`search-field-input pl-10 text-sm h-full w-40 active:w-60 focus:w-60 placeholder:text-black/25 dark:placeholder:text-white/25 ${keywordDesktop ? "pr-8" : "pr-3"}`}
    />
    {#if keywordDesktop}
        <button type="button" on:click={clearDesktopKeyword} aria-label={clearSearchLabel} class="search-clear-btn right-2">
            <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" class="text-sm"><path fill="currentColor" d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z"/></svg>
        </button>
    {/if}
</div>

<!-- toggle btn for phone/tablet view -->
<button on:click={togglePanel} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation lg:hidden! rounded-lg w-11 h-11 active:scale-90">
    <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" class="text-xl"><path fill="currentColor" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/></svg>
</button>

<!-- search panel -->
<div id="search-panel" class="search-panel-shell float-panel float-panel-closed absolute rounded-2xl p-2">

    <!-- search bar inside panel for phone/tablet -->
    <div id="search-bar-inside" class="search-field-shell flex relative lg:hidden items-center h-11 rounded-xl">
        <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" class="absolute text-xl pointer-events-none ml-3 transition my-auto text-30"><path fill="currentColor" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/></svg>
        <input
               aria-label={i18n(I18nKey.search)}
               placeholder="{i18n(I18nKey.search)}"
               bind:value={keywordMobile}
               on:keydown={handleInputKeydown}
               class={`search-field-input pl-10 absolute inset-0 w-full text-sm placeholder:text-black/25 dark:placeholder:text-white/25 ${keywordMobile ? "pr-9" : "pr-3"}`}
        />
        {#if keywordMobile}
            <button type="button" on:click={clearMobileKeyword} aria-label={clearSearchLabel} class="search-clear-btn right-2.5">
                <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" class="text-sm"><path fill="currentColor" d="m12 13.4l-4.9 4.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7l4.9-4.9l-4.9-4.9q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.9 4.9l4.9-4.9q.275-.275.7-.275t.7.275t.275.7t-.275.7L13.4 12l4.9 4.9q.275.275.275.7t-.275.7t-.7.275t-.7-.275z"/></svg>
            </button>
        {/if}
    </div>

    {#if hasActiveKeyword || result.length > 0}
        <div class="flex items-center justify-between px-2.5 pt-2 lg:pt-1 pb-1.5" aria-hidden="true">
            <div class="flex items-center gap-2 text-xs font-semibold text-75">
                <span class="optical-panel-beam" aria-hidden="true"></span>
                <span>{i18n(I18nKey.search)}</span>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="optical-chip-static px-1.5 py-0.5 rounded text-xs tabular-nums font-medium text-accent-foreground">
                    {result.length}
                </span>
                <kbd class="hidden lg:inline-flex optical-chip-static px-1.5 py-0.5 rounded text-xs font-mono text-muted">ESC</kbd>
            </div>
        </div>
        <div class="optical-hairline mb-1" aria-hidden="true"></div>
    {/if}

    <!-- search results -->
    {#if result.length > 0}
        {#each result as item, index}
            {#if index > 0}
                <div class="optical-hairline mx-2 my-0.5" aria-hidden="true"></div>
            {/if}
            <a href={item.url}
               class="optical-menu-item optical-search-result group flex items-center justify-between gap-3 rounded-xl pl-4 pr-3 py-2.5">
                <div class="min-w-0">
                    <div class="transition text-[0.94rem] font-bold leading-snug text-90 group-hover:text-accent-foreground truncate">
                        {item.meta.title}
                    </div>
                    <div class="transition text-xs leading-5 text-muted mt-0.5 line-clamp-2">
                        {@html item.excerpt}
                    </div>
                </div>
                <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" class="transition text-lg shrink-0 text-muted group-hover:text-accent-solid group-hover:translate-x-0.5"><path fill="currentColor" d="M12.6 12L8.7 8.1q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275l4.6 4.6q.15.15.213.325t.062.375t-.062.375t-.213.325l-4.6 4.6q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7z"/></svg>
            </a>
        {/each}
    {:else if hasActiveKeyword && !isSearching}
        <div class="py-6 px-4 text-center space-y-1.5">
            <div class="optical-chip-static w-9 h-9 mx-auto rounded-xl grid place-items-center text-accent-solid">
                <svg width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true" class="text-lg"><path fill="currentColor" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/></svg>
            </div>
            <div class="text-xs font-semibold text-75">{emptySearchTitle}</div>
            <div class="text-xs text-muted">{emptySearchHint}</div>
        </div>
    {/if}
</div>
