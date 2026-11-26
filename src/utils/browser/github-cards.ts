import {
	fetchGithubRepository,
	type GithubRepository,
	getGithubCardFields,
	normalizeGithubRepo,
} from "../github-repo";

let pageController: AbortController | null = null;
let generation = 0;
const cardAnimations = new WeakMap<HTMLElement, Animation[]>();

function updateCard(
	card: HTMLElement,
	update: () => void,
	fadeContent = false,
): void {
	const previousHeight = card.getBoundingClientRect().height;
	for (const animation of cardAnimations.get(card) ?? []) animation.cancel();
	update();
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

	// 用实际前后高度过渡，兼容自动换行；布局先展开，提示随后显现。
	const nextHeight = card.getBoundingClientRect().height;
	const animations: Animation[] = [];
	const duration = 240;
	const easing = "cubic-bezier(0.22, 1, 0.36, 1)";
	if (previousHeight !== nextHeight) {
		animations.push(
			card.animate(
				[
					{ height: `${previousHeight}px`, overflow: "clip" },
					{ height: `${nextHeight}px`, overflow: "clip" },
				],
				{ duration, easing },
			),
		);
	}
	const content = card.querySelector<HTMLElement>(".gc-content");
	if (fadeContent && content) {
		animations.push(
			content.animate([{ opacity: 0.6 }, { opacity: 1 }], {
				duration: 180,
				delay: animations.length ? 120 : 0,
				fill: "backwards",
				easing,
			}),
		);
	}
	const status = card.querySelector<HTMLElement>(".gc-status");
	if (status && !status.hidden) {
		animations.push(
			status.animate(
				[
					{ opacity: 0, transform: "translateY(-3px)" },
					{ opacity: 1, transform: "translateY(0)" },
				],
				{ duration: 160, delay: duration, fill: "backwards", easing },
			),
		);
	}
	cardAnimations.set(card, animations);
}

function setStatus(card: HTMLElement, isStale: boolean): void {
	const status = card.querySelector<HTMLElement>(".gc-status");
	if (!status) return;
	status.hidden = !isStale;
	if (isStale) {
		const hasSnapshot = Boolean(
			card.querySelector(".gc-infobar:not([hidden])"),
		);
		setField(
			card,
			".gc-status-text",
			hasSnapshot
				? "数据可能滞后，请进入仓库查看。"
				: "暂未获取仓库数据，请进入仓库查看。",
		);
	}
}

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
	for (const [selector, value, label] of [
		[".gc-stars", fields.stars, "Stars"],
		[".gc-forks", fields.forks, "Forks"],
		[".gc-license", fields.license, "License"],
		[".gc-language", fields.language, "Language"],
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
		updateCard(card, () => {
			card.dataset.githubState = "stale";
			card.removeAttribute("aria-busy");
			setStatus(card, true);
		});
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
		updateCard(card, () => {
			card.dataset.githubState = "updating";
			card.setAttribute("aria-busy", "true");
			setStatus(card, false);
		});
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
					updateCard(
						card,
						() => {
							if (snapshot) applySnapshot(card, repo, snapshot);
							card.dataset.githubState = snapshot ? "ready" : "stale";
							card.removeAttribute("aria-busy");
							setStatus(card, !snapshot);
						},
						Boolean(snapshot),
					);
				}
			},
		);
	}
}
