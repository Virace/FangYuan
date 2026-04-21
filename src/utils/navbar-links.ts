import type {
	NavBarLink,
	NavBarRefLink,
	ResolvedNavBarLink,
} from "../types/config.ts";
import type { ContentRouteManifest } from "./content-routes.ts";

type ResolveNavbarLinksOptions = {
	translateLabel?: (key: string) => string;
};

function isRefLink(link: NavBarLink): link is NavBarRefLink {
	return "ref" in link;
}

export function getNavBarLinkId(link: Pick<NavBarLink, "id" | "name">): string {
	const normalizedId = link.id?.trim();
	return normalizedId && normalizedId.length > 0 ? normalizedId : link.name;
}

function assertValidLink(link: NavBarLink): void {
	if (typeof link.id === "string" && link.id.trim() === "") {
		throw new Error("NavBar link id must not be empty.");
	}

	if (typeof link.name !== "string" || link.name.trim() === "") {
		throw new Error("NavBar link name is required.");
	}

	const hasUrl = "url" in link && typeof link.url === "string";
	const hasRef =
		"ref" in link && link.ref !== null && typeof link.ref === "object";

	if (hasUrl === hasRef) {
		throw new Error(
			`NavBar link "${getNavBarLinkId(link)}" must define exactly one of url or ref.`,
		);
	}

	if (hasRef && "external" in link) {
		throw new Error(
			`NavBar link "${getNavBarLinkId(link)}" must not define external when ref is used.`,
		);
	}

	if (
		hasRef &&
		link.ref.collection !== "spec" &&
		link.ref.collection !== "posts"
	) {
		throw new Error(
			`NavBar link "${getNavBarLinkId(link)}" uses unsupported collection "${String(link.ref.collection)}".`,
		);
	}
}

function assertUniqueLinkIds(links: NavBarLink[]): void {
	const seen = new Set<string>();

	for (const link of links) {
		const linkId = getNavBarLinkId(link);
		if (seen.has(linkId)) {
			throw new Error(`Duplicate NavBar link "${linkId}".`);
		}

		seen.add(linkId);
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
			`NavBar link "${getNavBarLinkId(link)}" references missing content "${link.ref.collection}:${link.ref.id}".`,
		);
	}

	return route.publicPath;
}

export function mergeNavBarLinks(
	defaultLinks: NavBarLink[],
	overrideLinks?: NavBarLink[],
	requiredLinks: NavBarLink[] = [],
): NavBarLink[] {
	const links = overrideLinks ? [...overrideLinks] : [...defaultLinks];
	const presentIds = new Set(links.map((link) => getNavBarLinkId(link)));

	for (const requiredLink of requiredLinks) {
		const requiredId = getNavBarLinkId(requiredLink);
		if (!presentIds.has(requiredId)) {
			links.push(requiredLink);
			presentIds.add(requiredId);
		}
	}

	links.forEach(assertValidLink);
	assertUniqueLinkIds(links);
	return links;
}

export function resolveNavbarLinks(
	links: NavBarLink[],
	manifest: Pick<ContentRouteManifest, "postByEntryId" | "specByEntryId">,
	options: ResolveNavbarLinksOptions = {},
): ResolvedNavBarLink[] {
	links.forEach(assertValidLink);
	assertUniqueLinkIds(links);

	const translateLabel = options.translateLabel ?? ((key: string) => key);

	return links.map((link) => {
		if (isRefLink(link)) {
			return {
				id: getNavBarLinkId(link),
				name: translateLabel(link.name),
				url: resolveRefUrl(link, manifest),
				external: false,
			};
		}

		return {
			id: getNavBarLinkId(link),
			name: translateLabel(link.name),
			url: link.url,
			external: link.external ?? false,
		};
	});
}
