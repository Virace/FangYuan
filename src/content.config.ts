import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { resolveContentRoot } from "./utils/site-source";

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

const relativeCoverImageSchema = (image: any) =>
	z
		.string()
		.regex(/^(?:\.\.?\/).+/, {
			message: "Relative cover images must start with ./ or ../.",
		})
		.pipe(image());

const localAliasImageSchema = z
	.string()
	.regex(/^(?!\.{1,2}\/)(?!\/)(?!public\/)(?!https?:\/\/)(?!data:).+/, {
		message:
			"Non-relative local cover images are treated as root aliases under src/ or site/.",
	});

const postsCollection = defineCollection({
	loader: glob({
		base: `${contentRoot}/posts`,
		pattern: "**/*.md",
		generateId: ({ entry }) => generateMarkdownId(entry),
	}),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			published: z.date(),
			updated: z.date().optional(),
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

			/* For internal use */
			prevTitle: z.string().default(""),
			prevSlug: z.string().default(""),
			nextTitle: z.string().default(""),
			nextSlug: z.string().default(""),
		}),
});

const specCollection = defineCollection({
	loader: glob({
		base: `${contentRoot}/spec`,
		pattern: "**/*.md",
		generateId: ({ entry }) => generateMarkdownId(entry),
	}),
	schema: z.object({}),
});

export const collections = {
	posts: postsCollection,
	spec: specCollection,
};
