import {
	defineCollection,
	type ImageFunction,
	type SchemaContext,
} from "astro:content";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { externalContentLoader } from "./utils/site-source/content-loader";
import { resolveContentRoot } from "./utils/site-source/source";

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

const contentRoot = resolveContentRoot();
const loaderContentRoot = path.isAbsolute(contentRoot)
	? pathToFileURL(contentRoot).href
	: contentRoot;

const publicPathSchema = z.string().regex(/^\/(?!\/).+/, {
	message: "Public image URLs must start with a single leading slash.",
});

const publicAliasSchema = z.string().regex(/^public\/.+/, {
	message: "Public image aliases must start with public/.",
});

const remoteImageSchema = z.string().regex(/^https?:\/\/.+/, {
	message: "Remote image URLs must start with http:// or https://.",
});

const dataImageSchema = z.string().regex(/^data:.+/, {
	message: "Data image URLs must start with data:.",
});

function relativeCoverImageSchema(image: ImageFunction) {
	// Astro's official image() helper already models relative content images.
	return image();
}

const localAliasImageSchema = z
	.string()
	.regex(/^(?!\.{1,2}\/)(?!\/)(?!public\/)(?!https?:\/\/)(?!data:).+/, {
		message:
			"Non-relative local cover images are treated as root aliases under src/ or the external site root.",
	});

const tocFrontmatterSchema = z
	.object({
		enable: z.boolean().optional(),
		depth: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
	})
	.optional();

const postsCollection: ReturnType<typeof defineCollection> = defineCollection({
	loader: externalContentLoader(
		glob({
			base: `${loaderContentRoot}/posts`,
			pattern: "**/*.md",
			generateId: ({ entry }) => generateMarkdownId(entry),
		}),
	),
	schema: ({ image }: SchemaContext) =>
		z.object({
			title: z.string(),
			published: z.date(),
			updated: z.date().optional(),
			alias: z.string().optional().default(""),
			permalink: z.string().optional().default(""),
			toc: tocFrontmatterSchema,
			draft: z.boolean().optional().default(false),
			description: z.string().optional().default(""),
			image: z
				.union([
					relativeCoverImageSchema(image),
					publicPathSchema,
					publicAliasSchema,
					remoteImageSchema,
					dataImageSchema,
					localAliasImageSchema,
					z.literal(""),
				])
				.optional()
				.default(""),
			tags: z.array(z.string()).optional().default([]),
			category: z.string().optional().nullable().default(""),
			lang: z.string().optional().default(""),
			sticky: z.number().int().min(0).optional(),
			comment: z.boolean().optional().default(true),

			/* For internal use */
			prevTitle: z.string().default(""),
			prevSlug: z.string().default(""),
			nextTitle: z.string().default(""),
			nextSlug: z.string().default(""),
		}),
});

const specCollection: ReturnType<typeof defineCollection> = defineCollection({
	loader: externalContentLoader(
		glob({
			base: `${loaderContentRoot}/spec`,
			pattern: "**/*.md",
			generateId: ({ entry }) => generateMarkdownId(entry),
		}),
	),
	schema: z.object({
		alias: z.string().optional().default(""),
		permalink: z.string().optional().default(""),
		toc: tocFrontmatterSchema,
		published: z.date().optional(),
		updated: z.date().optional(),
		comment: z.boolean().optional().default(false),
	}),
});

export const collections: {
	posts: typeof postsCollection;
	spec: typeof specCollection;
} = {
	posts: postsCollection,
	spec: specCollection,
};
