<script lang="ts">
import { onMount } from "svelte";
import I18nKey from "../i18n/i18nKey";
import { i18n } from "../i18n/translation";
import type { PostForList } from "../utils/content-utils";
import { getPostUrlByEntry } from "../utils/url-utils";

export let tags: string[] = [];
export let categories: string[] = [];
export let sortedPosts: PostForList[] = [];

const params = new URLSearchParams(window.location.search);
tags = params.has("tag") ? params.getAll("tag") : [];
categories = params.has("category") ? params.getAll("category") : [];
const uncategorized = params.get("uncategorized");

interface Group {
	year: number;
	posts: PostForList[];
}

let groups: Group[] = [];

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

	const grouped = filteredPosts.reduce(
		(acc, post) => {
			const year = post.data.published.getFullYear();
			if (!acc[year]) {
				acc[year] = [];
			}
			acc[year].push(post);
			return acc;
		},
		{} as Record<number, PostForList[]>,
	);

	const groupedPostsArray = Object.keys(grouped).map((yearStr) => ({
		year: Number.parseInt(yearStr, 10),
		posts: grouped[Number.parseInt(yearStr, 10)],
	}));

	groupedPostsArray.sort((a, b) => b.year - a.year);

	groups = groupedPostsArray;
});
</script>

<div class="card-base px-8 py-6">
    {#each groups as group}
        <div>
            <div class="flex flex-row w-full items-center h-15">
                <div class="archive-side-col transition text-2xl font-bold text-right text-75">
                    {group.year}
                </div>
                <div class="archive-side-col">
                    <div
                            class="h-3 w-3 bg-transparent rounded-full outline outline-primary mx-auto
                  -outline-offset-2 z-50"
                    ></div>
                </div>
                <div class="archive-main-col transition text-left text-50">
                    {group.posts.length} {i18n(group.posts.length === 1 ? I18nKey.postCount : I18nKey.postsCount)}
                </div>
            </div>

            {#each group.posts as post}
                <a
                        href={getPostUrlByEntry({ id: post.slug, data: post.data })}
                        aria-label={post.data.title}
                        class="group btn-plain block! h-10 w-full rounded-lg"
                >
                    <div class="flex flex-row justify-start items-center h-full">
                        <!-- date -->
                        <div class="archive-side-col transition text-sm text-right text-50">
                            {formatDate(post.data.published)}
                        </div>

                        <!-- dot and line -->
                        <div class="archive-side-col relative dash-line h-full flex items-center">
                            <div
                                    class="transition-all mx-auto w-1 h-1 rounded group-hover:h-5
                       bg-archive-dot group-hover:bg-primary outline-4 z-50
                       outline-card-bg
                       group-hover:outline-btn-plain-bg-hover
                       group-active:outline-btn-plain-bg-active"
                            ></div>
                        </div>

                        <!-- post title -->
                        <div
                                class="archive-title-col text-left font-bold
                     group-hover:translate-x-1 transition-all group-hover:text-primary
                     text-75 pr-8 whitespace-nowrap text-ellipsis overflow-hidden"
                        >
                            {post.data.title}
                        </div>

                        <!-- tag list -->
                        <div
                                class="hidden archive-tags-col text-left text-sm transition
                     whitespace-nowrap text-ellipsis overflow-hidden text-30"
                        >
                            {formatTag(post.data.tags)}
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    {/each}
</div>
