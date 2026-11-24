import type Swup from "@swup/astro/client/Swup";
import { isHomePaginationPath } from "../../permalink/materialization";
import { getArchivePath, pathsEqual, url } from "../../permalink/urls";
import type { OpticalTransitionRenderer, TransitionFrameState } from "./types";
import { VeilHost } from "./veil-host";

type Visit = Swup["visit"];

function isHome(visit: Visit): boolean {
	return pathsEqual(new URL(visit.to.url, location.href).pathname, url("/"));
}

function setBannerHome(home: boolean): void {
	document.body.classList.toggle("lg:is-home", home);
}

function getImprint(visit: Visit): TransitionFrameState["imprint"] {
	const path = new URL(visit.to.url, location.href).pathname;
	const home = isHome(visit);
	const archive = pathsEqual(path, url(getArchivePath()));
	const about = pathsEqual(path.replace(/\.html$/, ""), url("/about/"));
	let eyebrow = "ARTICLE";
	if (home || isHomePaginationPath(path, url("/page/")))
		eyebrow = "HOME · INDEX";
	else if (archive) eyebrow = "ARCHIVE";
	else if (about) eyebrow = "ABOUT";
	const link = visit.trigger.el;
	const title = (
		link?.getAttribute("data-transition-title") ||
		link?.getAttribute("aria-label") ||
		link?.textContent ||
		""
	)
		.replace(/\s+/g, " ")
		.trim();
	const generic =
		/^(?:上一篇|下一篇|阅读全文|阅读更多|read more|next|previous)[\s→←»«]*$/i;
	if (title && !generic.test(title)) return { eyebrow, title };
	const card = link
		?.closest(".card-base")
		?.querySelector<HTMLElement>("[data-transition-title]");
	const siteName =
		home &&
		document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')
			?.content;
	return {
		eyebrow,
		title: card?.dataset.transitionTitle || siteName || eyebrow,
	};
}

function installHistoryRestoration(swup: Swup) {
	const positions = new Map<
		number,
		{ url: string; top: number; left: number }
	>();
	let displayedEntry: number | undefined = history.state?.index;
	let displayedUrl = swup.location.url;
	let stopRestore: (() => void) | undefined;

	swup.hooks.before("visit:start", (visit) => {
		stopRestore?.();
		if (
			displayedEntry !== undefined &&
			displayedUrl === visit.from.url &&
			(visit.history.popstate || displayedEntry === history.state?.index)
		) {
			positions.set(displayedEntry, {
				url: visit.from.url,
				top: scrollY,
				left: scrollX,
			});
		}
	});
	swup.hooks.on("content:scroll", (visit) => {
		displayedEntry = history.state?.index;
		displayedUrl = visit.to.url;
		if (
			!visit.history.popstate ||
			visit.to.hash ||
			displayedEntry === undefined
		)
			return;
		const position = positions.get(displayedEntry);
		const grid = document.getElementById("main-grid");
		if (!position || position.url !== visit.to.url || !grid) return;
		// 浏览器可能在短页或尚未撑开的正文上恢复历史位置。仅在布局完成后补足，用户输入即让出滚动权。
		const inputs = new AbortController();
		const sizes = new ResizeObserver(() => {
			if (scrollY !== position.top || scrollX !== position.left) {
				window.scrollTo({
					top: position.top,
					left: position.left,
					behavior: "instant",
				});
			}
			if (
				Math.abs(scrollY - position.top) < 1 &&
				Math.abs(scrollX - position.left) < 1
			)
				stop();
		});
		function stop() {
			sizes.disconnect();
			inputs.abort();
			stopRestore = undefined;
		}
		stopRestore = stop;
		for (const event of ["wheel", "touchstart", "pointerdown", "keydown"]) {
			window.addEventListener(event, stop, {
				signal: inputs.signal,
				passive: true,
			});
		}
		sizes.observe(grid);
	});
}

function stickyThreshold(sticky: HTMLElement | null): number {
	const profile = sticky?.previousElementSibling;
	if (!sticky || !profile) return 0;
	// sticky.offsetTop 会包含吸顶后的位移。用其前一段的流内底边和边距还原自然顶边。
	const naturalTop =
		profile.getBoundingClientRect().bottom +
		scrollY +
		Number.parseFloat(getComputedStyle(profile).marginBottom);
	return Math.max(
		0,
		Math.ceil(naturalTop - sticky.getBoundingClientRect().top + 8),
	);
}

/** 每个 visit 有自己的置换许可；光幕可跨 visit 接续，一次只保留一个绘制循环。 */
export function installOpticalTransition(
	swup: Swup,
	renderer: OpticalTransitionRenderer,
): void {
	installHistoryRestoration(swup);
	const motion = matchMedia("(prefers-reduced-motion: reduce)");
	let host: VeilHost | undefined;
	let main: HTMLElement | null = null;
	let current: Visit | undefined;
	let permit = Promise.withResolvers<void>();
	let frame = 0;
	let started = 0;
	let previousTime = 0;
	let phaseStart = 0;
	let duration = 0;
	let rollStart = 0;
	let sidebarReturn: Animation | undefined;
	let quick = false;
	let pulsed = false;
	let replacedAt = 0;
	let slowFrames = 0;
	let sampleVisit = false;
	let warmed = false;
	let fadeVisit: Visit | undefined;
	const recentSlowVisits: boolean[] = [];
	let useFade = false;
	const state: TransitionFrameState = {
		phase: "entering",
		phaseProgress: 0,
		scrollNorm: 0,
		scrollVelocity: 0,
		elapsedSec: 0,
		dt: 0,
		width: 0,
		height: 0,
		dpr: 1,
		isDark: false,
		imprint: { eyebrow: "", title: "" },
	};

	function finish(completed = false) {
		if (completed && sampleVisit) {
			if (warmed) {
				recentSlowVisits.push(slowFrames >= 3);
				if (recentSlowVisits.length > 3) recentSlowVisits.shift();
				useFade = recentSlowVisits.filter(Boolean).length >= 2;
			}
			warmed = true;
		}
		sampleVisit = false;
		cancelAnimationFrame(frame);
		sidebarReturn?.cancel();
		sidebarReturn = undefined;
		frame = 0;
		permit.resolve();
		if (host) renderer.dispose();
		host?.remove();
		host = undefined;
		current = undefined;
		main = null;
		document.documentElement.classList.remove("optical-transition-active");
	}

	function fade(visit: Visit) {
		finish();
		fadeVisit = visit;
		document.documentElement.classList.add("optical-transition-light");
		document.documentElement.classList.toggle(
			"optical-banner-changing",
			document.body.classList.contains("lg:is-home") !== isHome(visit),
		);
	}

	function releaseFade() {
		if (fadeVisit && !useFade) {
			document.documentElement.classList.remove(
				"optical-transition-light",
				"optical-banner-changing",
			);
		}
		fadeVisit = undefined;
	}

	function phase(name: TransitionFrameState["phase"], now: number, ms: number) {
		state.phase = name;
		state.phaseProgress = 0;
		phaseStart = now;
		duration = ms;
	}

	function pulseBanner() {
		if (pulsed) return;
		document.querySelector("optical-banner")?.dispatchEvent(
			new CustomEvent("fangyuan:optical-pulse", {
				detail: {
					onPlay: () => {
						pulsed = true;
					},
				},
			}),
		);
	}

	function hold(visit: Visit, now: number) {
		phase("holding", now, quick ? 115 : 160);
		state.scrollNorm = 0;
		state.scrollVelocity = 0;
		setBannerHome(isHome(visit));
		pulseBanner();
		permit.resolve();
	}

	function close(visit: Visit, now: number) {
		const sticky =
			!quick && matchMedia("(min-width: 1024px)").matches
				? document.getElementById("sidebar-sticky")
				: null;
		const threshold = stickyThreshold(sticky);
		rollStart = quick ? 0 : Math.min(scrollY, threshold);
		if (scrollY !== rollStart) {
			const previousTop = sticky?.getBoundingClientRect().top;
			sidebarReturn?.cancel();
			window.scrollTo({ top: rollStart, behavior: "instant" });
			if (sticky && previousTop !== undefined) {
				const offset = previousTop - sticky.getBoundingClientRect().top;
				if (offset < -1) {
					sidebarReturn = sticky.animate(
						[{ translate: `0 ${offset}px` }, { translate: "0 0" }],
						{ duration: 180, easing: "ease-out" },
					);
				}
			}
		}
		if (!rollStart) return hold(visit, now);
		state.scrollNorm = 1;
		phase("rolling", now, Math.min(380, Math.max(240, rollStart * 0.7)));
	}

	function paint() {
		if (!host?.ctx || !main) return;
		host.sync(main);
		Object.assign(state, host.geometry);
		renderer.render(host.ctx, state);
	}

	function draw(now: number) {
		frame = 0;
		if (!current || !host?.ctx || !main || (current.done && !replacedAt))
			return finish();
		const elapsed = Math.max(0, now - previousTime) / 1000;
		if (
			sampleVisit &&
			previousTime !== started &&
			state.phase !== "holding" &&
			elapsed > 0.045
		)
			slowFrames++;
		state.dt = Math.min(0.034, elapsed);
		state.elapsedSec = (now - started) / 1000;
		previousTime = now;
		const progress = Math.min(1, Math.max(0, (now - phaseStart) / duration));
		state.phaseProgress = progress;
		switch (state.phase) {
			case "entering":
				if (progress === 1) close(current, quick ? phaseStart + duration : now);
				break;
			case "rolling": {
				const top = Math.round(rollStart * (1 - progress) ** 3);
				state.scrollVelocity = elapsed
					? Math.max(0, scrollY - top) / elapsed
					: 0;
				window.scrollTo({ top, behavior: "instant" });
				state.scrollNorm = top / rollStart;
				if (progress === 1) hold(current, now);
				break;
			}
			case "holding":
				if (replacedAt && progress === 1)
					phase(
						"exiting",
						Math.max(phaseStart + duration, replacedAt),
						quick ? 275 : 350,
					);
				break;
			case "exiting":
				if (progress === 1) return finish(true);
				break;
		}
		paint();
		frame = requestAnimationFrame(draw);
	}

	swup.hooks.on("visit:start", (visit) => {
		releaseFade();
		main = document.getElementById("swup-container");
		const eligible =
			visit.animation.animate &&
			visit.scroll.reset &&
			!visit.history.popstate &&
			!visit.to.hash &&
			!visit.scroll.target &&
			!motion.matches;
		if (eligible && useFade && main) {
			return fade(visit);
		}
		document.documentElement.classList.remove("optical-banner-changing");
		if (!eligible || !main) {
			finish();
			setBannerHome(isHome(visit));
			return;
		}
		const continuing = !!host;
		pulsed = false;
		slowFrames = 0;
		sampleVisit = !continuing && document.visibilityState === "visible";
		host ??= new VeilHost();
		if (!host.ctx) {
			useFade = true;
			return fade(visit);
		}
		const now = performance.now();
		permit.resolve();
		permit = Promise.withResolvers<void>();
		current = visit;
		replacedAt = 0;
		quick = scrollY <= 16;
		state.imprint = getImprint(visit);
		if (!continuing) {
			host.sync(main);
			try {
				renderer.prepare({ mainElement: main, ...host.geometry });
			} catch {
				return fade(visit);
			}
			started = previousTime = now;
			state.scrollNorm = quick ? 0 : 1;
			state.scrollVelocity = 0;
			phase("entering", now, quick ? 160 : 205);
		} else if (state.phase === "exiting") {
			phase("entering", now, Math.max(32, 160 * state.phaseProgress));
		} else if (state.phase === "holding") {
			close(visit, now);
		}
		visit.animation.selector = false;
		visit.scroll.animate = false;
		document.documentElement.classList.add("optical-transition-active");
		if (!isHome(visit)) {
			setBannerHome(false);
			pulseBanner();
		}
		if (!frame) frame = requestAnimationFrame(draw);
	});
	swup.hooks.before("animation:out:await", (visit, args) => {
		if (visit !== current) return;
		args.skip = true;
		return permit.promise;
	});
	swup.hooks.on("visit:abort", (visit) => {
		if (visit === current) {
			sampleVisit = false;
			permit.resolve();
		}
	});
	swup.hooks.on("visit:end", (visit) => {
		if (visit === fadeVisit) releaseFade();
	});
	swup.hooks.before("content:scroll", (visit) => {
		if (visit === current) visit.scroll.scrolledToContent = true;
		if (!visit.to.hash && !visit.scroll.target) visit.scroll.animate = false;
	});
	swup.hooks.on("content:replace", (visit) => {
		if (visit === fadeVisit) {
			setBannerHome(isHome(visit));
			const revealed = document.getElementById("swup-container");
			if (revealed) revealed.dataset.opticalRevealed = "";
		}
		if (visit !== current) return;
		main = document.getElementById("swup-container");
		if (!main) return finish();
		main.dataset.opticalRevealed = "";
		state.imprint.title =
			main.dataset.swupAnnouncement?.trim() || document.title;
		setBannerHome(isHome(visit));
		pulseBanner();
		replacedAt = performance.now();
		state.dt = 0;
		paint();
	});
	motion.addEventListener("change", () => {
		if (!motion.matches || !current) return;
		setBannerHome(isHome(current));
		finish();
	});
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) sampleVisit = false;
	});
	window.addEventListener("pagehide", () => finish());
}
