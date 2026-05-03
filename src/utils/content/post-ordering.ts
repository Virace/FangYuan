import type { PostSortConfig, PostSortKey } from "../../types/config";

type SortablePostRoute = {
	entryId: string;
	publicPath: string;
	entry: {
		id: string;
		filePath?: string;
		data: {
			title: string;
			published: Date;
			updated?: Date;
			alias?: string;
			sticky?: number;
			prevTitle?: string;
			prevSlug?: string;
			nextTitle?: string;
			nextSlug?: string;
			prevPermalink?: string;
			nextPermalink?: string;
		};
	};
};

type StickyData = {
	sticky?: number;
};

export function isPinnedPost(data: StickyData): boolean {
	return typeof data.sticky === "number";
}

function getFileStem(route: SortablePostRoute): string {
	const source =
		route.entry.filePath?.replace(/\\/g, "/").replace(/\/+$/g, "") ||
		route.entryId;
	const fileName = source.split("/").at(-1) ?? source;
	return fileName.replace(/\.[^.]*$/, "") || fileName;
}

function getAliasFallback(route: SortablePostRoute): string {
	return route.entryId.split("/").at(-1) ?? route.entryId;
}

function getEffectiveUpdated(route: SortablePostRoute): Date {
	return route.entry.data.updated ?? route.entry.data.published;
}

function getComparableValue(
	route: SortablePostRoute,
	key: PostSortKey,
): string | number {
	switch (key) {
		case "title":
			return route.entry.data.title;
		case "published":
			return route.entry.data.published.getTime();
		case "updated":
			return getEffectiveUpdated(route).getTime();
		case "alias":
			return route.entry.data.alias?.trim() || getAliasFallback(route);
		case "filename":
			return getFileStem(route);
	}
}

function compareText(left: string, right: string): number {
	return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function compareValue(
	left: string | number,
	right: string | number,
	order: PostSortConfig["order"],
): number {
	const result =
		typeof left === "number" && typeof right === "number"
			? left - right
			: compareText(String(left), String(right));

	return order === "asc" ? result : -result;
}

export function sortPostRoutes<T extends SortablePostRoute>(
	routes: T[],
	postSort: PostSortConfig,
): T[] {
	return [...routes].sort((left, right) => {
		const pinnedDiff =
			Number(isPinnedPost(right.entry.data)) -
			Number(isPinnedPost(left.entry.data));
		if (pinnedDiff !== 0) {
			return pinnedDiff;
		}

		const stickyDiff =
			(right.entry.data.sticky ?? 0) - (left.entry.data.sticky ?? 0);
		if (stickyDiff !== 0) {
			return stickyDiff;
		}

		const primaryDiff = compareValue(
			getComparableValue(left, postSort.key),
			getComparableValue(right, postSort.key),
			postSort.order,
		);
		if (primaryDiff !== 0) {
			return primaryDiff;
		}

		const publishedDiff =
			right.entry.data.published.getTime() -
			left.entry.data.published.getTime();
		if (publishedDiff !== 0) {
			return publishedDiff;
		}

		const titleDiff = compareText(
			left.entry.data.title,
			right.entry.data.title,
		);
		if (titleDiff !== 0) {
			return titleDiff;
		}

		return compareText(left.entryId, right.entryId);
	});
}

export function attachAdjacentPostLinks<T extends SortablePostRoute>(
	routes: T[],
): T[] {
	return routes.map((route, index) => {
		const previous = routes[index + 1];
		const next = routes[index - 1];

		return {
			...route,
			entry: {
				...route.entry,
				data: {
					...route.entry.data,
					prevTitle: previous?.entry.data.title ?? "",
					prevSlug: previous?.entryId ?? "",
					prevPermalink: previous?.publicPath ?? "",
					nextTitle: next?.entry.data.title ?? "",
					nextSlug: next?.entryId ?? "",
					nextPermalink: next?.publicPath ?? "",
				},
			},
		};
	});
}
