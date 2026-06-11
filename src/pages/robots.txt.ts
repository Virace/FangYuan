import { url } from "@utils/permalink/urls";
import type { APIRoute } from "astro";

function buildRobotsTxt(): string {
	const lines = ["User-agent: *", "Disallow: /_astro/"];

	if (import.meta.env.SITE) {
		lines.push(
			"",
			`Sitemap: ${new URL(url("sitemap-index.xml"), import.meta.env.SITE).href}`,
		);
	}

	return lines.join("\n");
}

export const GET: APIRoute = () => {
	return new Response(buildRobotsTxt(), {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
