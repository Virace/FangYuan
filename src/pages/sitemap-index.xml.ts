import { getAbsolutePublicUrl } from "./rss.xml";
import type { APIContext } from "astro";

export const prerender = true;

export function GET(context: APIContext): Response {
	if (!context.site) {
		return new Response(null, { status: 204 });
	}

	const sitemapUrl = getAbsolutePublicUrl(context.site, "/sitemap-0.xml");
	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		`<sitemap><loc>${sitemapUrl}</loc></sitemap>`,
		"</sitemapindex>",
	].join("");

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
		},
	});
}
