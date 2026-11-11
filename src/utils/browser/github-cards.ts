import {
	fetchGithubRepository,
	type GithubRepository,
	getGithubCardFields,
	normalizeGithubRepo,
} from "../github-repo";

let pageController: AbortController | null = null;
let generation = 0;

function setField(
	card: HTMLElement,
	selector: string,
	value: string | null,
): void {
	const element = card.querySelector<HTMLElement>(selector);
	if (!element) return;
	element.textContent = value ?? "";
	element.hidden = value === null;
}

function applySnapshot(
	card: HTMLAnchorElement,
	repo: string,
	snapshot: GithubRepository,
): void {
	const fields = getGithubCardFields(repo, snapshot);
	card.href = fields.href;
	setField(card, ".gc-user", fields.owner);
	setField(card, ".gc-repo", fields.name);
	setField(card, ".gc-description", fields.description);
	setField(card, ".gc-language", fields.language);
	for (const [selector, value, label] of [
		[".gc-stars", fields.stars, "Stars"],
		[".gc-forks", fields.forks, "Forks"],
		[".gc-license", fields.license, "License"],
	] as const) {
		setField(card, selector, value);
		const element = card.querySelector(selector);
		if (value !== null)
			element?.setAttribute("aria-label", `${label}: ${value}`);
		else element?.removeAttribute("aria-label");
	}
	const infobar = card.querySelector<HTMLElement>(".gc-infobar");
	if (infobar) infobar.hidden = false;
	const avatar = card.querySelector<HTMLImageElement>(".gc-avatar");
	if (avatar) {
		avatar.hidden = !fields.avatarUrl;
		if (fields.avatarUrl) avatar.src = fields.avatarUrl;
		else avatar.removeAttribute("src");
	}
}

export function cancelGithubCards(): void {
	generation += 1;
	pageController?.abort();
	pageController = null;
	for (const card of document.querySelectorAll<HTMLAnchorElement>(
		'a.card-github[data-github-state="updating"]',
	)) {
		card.dataset.githubState = "stale";
		card.removeAttribute("aria-busy");
		setField(card, ".gc-status", "暂未更新");
	}
}

export function refreshGithubCards(): void {
	cancelGithubCards();
	const currentGeneration = generation;
	const controller = new AbortController();
	pageController = controller;
	const cardsByRepo = new Map<
		string,
		{ repo: string; cards: HTMLAnchorElement[] }
	>();
	for (const card of document.querySelectorAll<HTMLAnchorElement>(
		"a.card-github[data-github-repo]",
	)) {
		const repo = normalizeGithubRepo(card.dataset.githubRepo);
		if (!repo) continue;
		card.dataset.githubState = "updating";
		card.setAttribute("aria-busy", "true");
		setField(card, ".gc-status", null);
		const avatar = card.querySelector<HTMLImageElement>(".gc-avatar");
		if (avatar)
			avatar.onerror = () => {
				avatar.hidden = true;
			};
		const key = repo.toLowerCase();
		const group = cardsByRepo.get(key) ?? { repo, cards: [] };
		group.cards.push(card);
		cardsByRepo.set(key, group);
	}
	for (const { repo, cards } of cardsByRepo.values()) {
		void fetchGithubRepository(repo, { signal: controller.signal }).then(
			(snapshot) => {
				// Swup 离开后，即使旧请求已经完成，也只能更新它原来所属的页面。
				if (currentGeneration !== generation || controller.signal.aborted)
					return;
				for (const card of cards) {
					if (!card.isConnected) continue;
					if (snapshot) applySnapshot(card, repo, snapshot);
					card.dataset.githubState = snapshot ? "ready" : "stale";
					card.removeAttribute("aria-busy");
					setField(card, ".gc-status", snapshot ? null : "暂未更新");
				}
			},
		);
	}
}
