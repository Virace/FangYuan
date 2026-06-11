import rss from "@astrojs/rss";
import { getSortedPosts } from "@utils/content/posts";
import { renderFeedHtml } from "@utils/content/rss";
import { url } from "@utils/permalink/urls";
import type { APIContext } from "astro";
import { siteConfig } from "@/config";

export function getAbsolutePublicUrl(site: URL, publicPath: string): string {
	return new URL(url(publicPath), site).href;
}

function getRequiredPublicPath(post: {
	id: string;
	data: {
		publicPath?: string;
	};
}): string {
	if (!post.data.publicPath) {
		throw new Error(`Post "${post.id}" is missing resolved publicPath.`);
	}

	return post.data.publicPath;
}

export async function GET(context: APIContext): Promise<Response> {
	if (!context.site) {
		return new Response(null, { status: 204 });
	}

	const site = context.site;
	const blog = await getSortedPosts();
	const siteRootUrl = new URL(url("/"), site);

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: siteRootUrl,
		items: blog.map((post) => {
			return {
				title: post.data.title,
				pubDate: post.data.published,
				description: post.data.description || "",
				link: getAbsolutePublicUrl(site, getRequiredPublicPath(post)),
				content: renderFeedHtml(
					typeof post.body === "string" ? post.body : String(post.body || ""),
				),
			};
		}),
		customData: `<language>${siteConfig.lang}</language>`,
	});
}
