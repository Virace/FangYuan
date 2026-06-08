import type {
	CategorySortConfig,
	TaxonomySortConfig,
} from "../../types/config";

type TaxonomyItem = {
	name: string;
	count: number;
};

function compareText(left: string, right: string): number {
	return left.localeCompare(right, undefined, {
		sensitivity: "base",
		numeric: true,
	});
}

function comparePrimary(
	left: TaxonomyItem,
	right: TaxonomyItem,
	sortConfig: TaxonomySortConfig,
): number {
	const result =
		sortConfig.key === "count"
			? left.count - right.count
			: compareText(left.name, right.name);

	return sortConfig.order === "asc" ? result : -result;
}

export function sortTaxonomyItems<T extends TaxonomyItem>(
	items: T[],
	sortConfig: TaxonomySortConfig,
): T[] {
	return [...items].sort((left, right) => {
		const primaryDiff = comparePrimary(left, right, sortConfig);
		if (primaryDiff !== 0) {
			return primaryDiff;
		}

		return compareText(left.name, right.name);
	});
}

export function sortCategoryItems<T extends TaxonomyItem>(
	items: T[],
	sortConfig: CategorySortConfig,
	uncategorizedName: string,
): T[] {
	const sortedItems = sortTaxonomyItems(items, sortConfig);

	if (sortConfig.uncategorizedPosition !== "last") {
		return sortedItems;
	}

	const regularItems = sortedItems.filter(
		(item) => item.name !== uncategorizedName,
	);
	const uncategorizedItems = sortedItems.filter(
		(item) => item.name === uncategorizedName,
	);

	return [...regularItems, ...uncategorizedItems];
}
