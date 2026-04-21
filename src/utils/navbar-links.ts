import type {
	LinkPreset,
	NavBarLink,
	NavBarRefLink,
	ResolvedNavBarLink,
} from "../types/config.ts";
import type { ContentRouteManifest } from "./content-routes.ts";

function isRefLink(link: NavBarLink): link is NavBarRefLink {
	return "ref" in link;
}

function assertValidLink(link: NavBarLink): void {
	if (typeof link.name !== "string" || link.name.trim() === "") {
		throw new Error("NavBar link name is required.");
	}

	const hasUrl = "url" in link && typeof link.url === "string";
	const hasRef =
		"ref" in link && link.ref !== null && typeof link.ref === "object";

	if (hasUrl === hasRef) {
		throw new Error(
			`NavBar link "${link.name}" must define exactly one of url or ref.`,
		);
	}

	if (hasRef && "external" in link) {
		throw new Error(
			`NavBar link "${link.name}" must not define external when ref is used.`,
		);
	}

	if (
		hasRef &&
		link.ref.collection !== "spec" &&
		link.ref.collection !== "posts"
	) {
		throw new Error(
			`NavBar link "${link.name}" uses unsupported collection "${String(link.ref.collection)}".`,
		);
	}
}

function resolveRefUrl(
	link: NavBarRefLink,
	manifest: Pick<ContentRouteManifest, "postByEntryId" | "specByEntryId">,
): string {
	const route =
		link.ref.collection === "spec"
			? manifest.specByEntryId.get(link.ref.id)
			: manifest.postByEntryId.get(link.ref.id);

	if (!route) {
		if (link.ref.collection === "spec" && link.ref.id === "about") {
			throw new Error("About page content not found");
		}

		throw new Error(
			`NavBar link "${link.name}" references missing content "${link.ref.collection}:${link.ref.id}".`,
		);
	}

	return route.publicPath;
}

export function resolveNavbarLinks(
	links: (NavBarLink | LinkPreset)[],
	manifest: Pick<ContentRouteManifest, "postByEntryId" | "specByEntryId">,
	presetMap: Record<LinkPreset, NavBarLink>,
): ResolvedNavBarLink[] {
	return links.map((item) => {
		const link = typeof item === "number" ? presetMap[item] : item;
		assertValidLink(link);

		if (isRefLink(link)) {
			return {
				name: link.name,
				url: resolveRefUrl(link, manifest),
				external: false,
			};
		}

		return {
			name: link.name,
			url: link.url,
			external: link.external ?? false,
		};
	});
}
