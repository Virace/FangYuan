import { defineCollection } from "astro:content";
import type { CollectionConfig } from "astro/content/config";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

export type GlobCollectionLoader = ReturnType<typeof glob>;
export type ObjectCollectionSchema = z.ZodObject<z.ZodRawShape>;

function generateMarkdownId(entry: string): string {
	const normalizedEntry = entry.replace(/\\/g, "/");
	const entryWithoutExtension = normalizedEntry.replace(/\.md$/, "");

	if (
		entryWithoutExtension !== "index" &&
		entryWithoutExtension.endsWith("/index")
	) {
		return entryWithoutExtension.slice(0, -"/index".length);
	}

	return entryWithoutExtension;
}

const postsCollection: CollectionConfig<
	ObjectCollectionSchema,
	GlobCollectionLoader
> = defineCollection({
	loader: glob({
		base: "./src/content/posts",
		pattern: "**/*.md",
		generateId: ({ entry }) => generateMarkdownId(entry),
	}),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});

const specCollection: CollectionConfig<
	ObjectCollectionSchema,
	GlobCollectionLoader
> = defineCollection({
	loader: glob({
		base: "./src/content/spec",
		pattern: "**/*.md",
		generateId: ({ entry }) => generateMarkdownId(entry),
	}),
	schema: z.object({}),
});

export const collections: {
	posts: CollectionConfig<ObjectCollectionSchema, GlobCollectionLoader>;
	spec: CollectionConfig<ObjectCollectionSchema, GlobCollectionLoader>;
} = {
	posts: postsCollection,
	spec: specCollection,
};
