import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import {
	getPostRouteManifest,
	shouldExposePostEntry,
} from "@utils/content-routes";
import { getCategoryUrl } from "@utils/permalink/urls.ts";
import type { TocFrontmatterOverride } from "@utils/toc-config";
import type { ImageMetadata } from "astro";
import { siteConfig } from "../../config";
import { sortCategoryItems, sortTaxonomyItems } from "./taxonomy-ordering";

export type PostData = {
	title: string;
	published: Date;
	updated?: Date;
	alias: string;
	permalink: string;
	toc?: TocFrontmatterOverride;
	draft: boolean;
	description: string;
	image: string | ImageMetadata;
	tags: string[];
	category: string | null;
	lang: string;
	sticky?: number;
	comment: boolean;
	prevTitle: string;
	prevSlug: string;
	nextTitle: string;
	nextSlug: string;
	publicPath?: string;
	prevPermalink?: string;
	nextPermalink?: string;
};

export type PostEntry = Omit<CollectionEntry<"posts">, "data"> & {
	data: PostData;
};

export async function getSortedPosts(): Promise<PostEntry[]> {
	const postRoutes = await getPostRouteManifest();

	return postRoutes.entries.map((route) => ({
		...route.entry,
		collection: "posts" as const,
		id: route.entryId,
		data: route.entry.data as PostData,
	}));
}

export type PostForList = {
	slug: string;
	data: PostData;
};

export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getSortedPosts();
	return sortedFullPosts.map((post) => ({
		slug: post.id,
		data: post.data,
	}));
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = (await getCollection(
		"posts",
		(entry: CollectionEntry<"posts">) => shouldExposePostEntry(entry),
	)) as PostEntry[];

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	const tags = Object.keys(countMap).map((key) => ({
		name: key,
		count: countMap[key],
	}));

	return sortTaxonomyItems(tags, siteConfig.taxonomySort.tags);
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(): Promise<Category[]> {
	const allBlogPosts = (await getCollection(
		"posts",
		(entry: CollectionEntry<"posts">) => shouldExposePostEntry(entry),
	)) as PostEntry[];
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post) => {
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const categories: Category[] = Object.keys(count).map((categoryName) => ({
		name: categoryName,
		count: count[categoryName],
		url: getCategoryUrl(categoryName),
	}));

	return sortCategoryItems(
		categories,
		siteConfig.taxonomySort.categories,
		i18n(I18nKey.uncategorized),
	);
}
