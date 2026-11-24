<script lang="ts">
import { onMount } from "svelte";
import I18nKey from "../i18n/i18nKey";
import { i18n } from "../i18n/translation";
import {
	type ArchivePostGroup,
	buildArchivePostGroups,
} from "../utils/content/archive-groups";
import type { PostForList } from "../utils/content/posts";
import { getPostUrlByEntry } from "../utils/permalink/urls";

export let tags: string[] = [];
export let categories: string[] = [];
export let sortedPosts: PostForList[] = [];
export let showPinnedInTimeline = true;

const params = new URLSearchParams(window.location.search);
tags = params.has("tag") ? params.getAll("tag") : [];
categories = params.has("category") ? params.getAll("category") : [];
const uncategorized = params.get("uncategorized");

let groups: ArchivePostGroup[] = [];
let pinnedPosts: PostForList[] = [];

function formatDate(date: Date) {
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${month}-${day}`;
}

function formatTag(tagList: string[]) {
	return tagList.map((t) => `#${t}`).join(" ");
}

onMount(async () => {
	let filteredPosts: PostForList[] = sortedPosts;

	if (tags.length > 0) {
		filteredPosts = filteredPosts.filter(
			(post) =>
				Array.isArray(post.data.tags) &&
				post.data.tags.some((tag) => tags.includes(tag)),
		);
	}

	if (categories.length > 0) {
		filteredPosts = filteredPosts.filter(
			(post) => post.data.category && categories.includes(post.data.category),
		);
	}

	if (uncategorized) {
		filteredPosts = filteredPosts.filter((post) => !post.data.category);
	}

	const archiveGroups = buildArchivePostGroups(filteredPosts, {
		showPinnedInTimeline,
	});
	pinnedPosts = archiveGroups.pinnedPosts;
	groups = archiveGroups.yearGroups;
});
</script>

<div class="card-base panel-edge px-8 py-6">
    {#if pinnedPosts.length > 0}
        <div>
            <div class="flex flex-row w-full items-center h-15">
                <div class="archive-side-col transition text-2xl font-bold text-right text-75">
                    {i18n(I18nKey.pinnedPosts)}
                </div>
                <div class="archive-side-col">
                    <div
                            class="h-2.5 w-2.5 bg-transparent rounded-full border-2 border-accent-solid mx-auto z-50"
                    ></div>
                </div>
                <div class="archive-main-col transition text-left text-muted">
                    {pinnedPosts.length} {i18n(pinnedPosts.length === 1 ? I18nKey.postCount : I18nKey.postsCount)}
                </div>
            </div>

            {#each pinnedPosts as post}
                <a
                        href={getPostUrlByEntry({ id: post.slug, data: post.data })}
                        class="group btn-plain block! h-10 w-full rounded-lg"
                >
                    <div class="flex flex-row justify-start items-center h-full">
                        <div class="archive-side-col transition text-sm text-right text-muted">
                            {formatDate(post.data.published)}
                        </div>

                        <div class="archive-side-col relative dash-line h-full flex items-center">
                            <div class="archive-rail-dot mx-auto z-50"></div>
                        </div>

                        <div
                                class="archive-title-col text-left font-bold
                     group-hover:translate-x-1 transition-all group-hover:text-accent-foreground
                     text-75 pr-8 whitespace-nowrap text-ellipsis overflow-hidden"
                        >
                            {post.data.title}
                        </div>

                        <div
                                class="hidden archive-tags-col text-left text-sm transition
                     whitespace-nowrap text-ellipsis overflow-hidden text-muted"
                        >
                            {formatTag(post.data.tags)}
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    {/if}

    {#each groups as group}
        <div>
            <div class="flex flex-row w-full items-center h-15">
                <div class="archive-side-col transition text-2xl font-bold text-right text-75">
                    {group.year}
                </div>
                <div class="archive-side-col">
                    <div
                            class="h-2.5 w-2.5 bg-transparent rounded-full border-2 border-accent-solid mx-auto z-50"
                    ></div>
                </div>
                <div class="archive-main-col transition text-left text-muted">
                    {group.posts.length} {i18n(group.posts.length === 1 ? I18nKey.postCount : I18nKey.postsCount)}
                </div>
            </div>

            {#each group.posts as post}
                <a
                        href={getPostUrlByEntry({ id: post.slug, data: post.data })}
                        class="group btn-plain block! h-10 w-full rounded-lg"
                >
                    <div class="flex flex-row justify-start items-center h-full">
                        <!-- date -->
                        <div class="archive-side-col transition text-sm text-right text-muted">
                            {formatDate(post.data.published)}
                        </div>

                        <!-- dot and line -->
                        <div class="archive-side-col relative dash-line h-full flex items-center">
                            <div class="archive-rail-dot mx-auto z-50"></div>
                        </div>

                        <!-- post title -->
                        <div
                                class="archive-title-col text-left font-bold
                     group-hover:translate-x-1 transition-all group-hover:text-accent-foreground
                     text-75 pr-8 whitespace-nowrap text-ellipsis overflow-hidden"
                        >
                            {post.data.title}
                        </div>

                        <!-- tag list -->
                        <div
                                class="hidden archive-tags-col text-left text-sm transition
                     whitespace-nowrap text-ellipsis overflow-hidden text-muted"
                        >
                            {formatTag(post.data.tags)}
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    {/each}
</div>
