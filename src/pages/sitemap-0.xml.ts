import { getContentRouteManifest } from "@utils/content-routes";
import { getAbsolutePublicUrl } from "./rss.xml";
import type { APIContext } from "astro";

export const prerender = true;

function renderXmlUrl(location: string): string {
	return `<url><loc>${location}</loc></url>`;
}

export async function GET(context: APIContext): Promise<Response> {
	if (!context.site) {
		return new Response(null, { status: 204 });
	}

	const manifest = await getContentRouteManifest();
	const pageUrls = [
		"/",
		"/rss.xml",
		...manifest.routes.map((route) => route.publicPath),
	];
	const uniqueUrls = Array.from(
		new Set(pageUrls.map((publicPath) => getAbsolutePublicUrl(context.site!, publicPath))),
	).sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...uniqueUrls.map(renderXmlUrl),
		"</urlset>",
	].join("");

	return new Response(body, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
		},
	});
}
