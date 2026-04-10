const SWUP_ANNOUNCEMENT_SELECTOR = "[data-swup-announcement]";

interface SwupAnnouncementElement {
	getAttribute(name: string): string | null;
	textContent: string | null;
}

interface SwupAnnouncementRoot {
	querySelector(selector: string): SwupAnnouncementElement | null;
}

const trimToUndefined = (value?: string | null): string | undefined => {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
};

const readCanonicalSwupAnnouncement = (
	root: SwupAnnouncementRoot,
): string | undefined => {
	const element = root.querySelector(SWUP_ANNOUNCEMENT_SELECTOR);

	return (
		trimToUndefined(element?.getAttribute("data-swup-announcement")) ??
		trimToUndefined(element?.textContent)
	);
};

export const resolveSwupAnnouncementText = (
	root: SwupAnnouncementRoot,
	documentTitle?: string | null,
): string | undefined => {
	return readCanonicalSwupAnnouncement(root) ?? trimToUndefined(documentTitle);
};
