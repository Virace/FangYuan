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

function resolveBannerExtendPx(): number {
	if (
		!matchMedia("(min-width: 1024px)").matches ||
		!document.body.classList.contains("enable-banner")
	) {
		return 0;
	}
	const raw = getComputedStyle(document.documentElement)
		.getPropertyValue("--banner-height-extend")
		.trim();
	return Number.parseFloat(raw) || 0;
}

/** 剥离 #main-grid 当前进行中的 translateY，还原基准顶边与当前实际位移。 */
function resolveMainGridMetrics(main: HTMLElement): {
	baseTop: number;
	currentOffsetY: number;
} {
	const grid = document.getElementById("main-grid");
	const currentOffsetY = grid
		? new DOMMatrixReadOnly(getComputedStyle(grid).transform).m42
		: 0;
	return {
		baseTop: main.getBoundingClientRect().top - currentOffsetY,
		currentOffsetY,
	};
}

function computeVisibleHeights(
	baseTop: number,
	currentHome: boolean,
	targetHome: boolean,
): { startVisibleHeight: number; targetVisibleHeight: number } {
	const top = Math.max(0, baseTop);
	const extend = resolveBannerExtendPx();
	return {
		startVisibleHeight: Math.max(
			0,
			innerHeight - (top + (currentHome ? extend : 0)),
		),
		targetVisibleHeight: Math.max(
			0,
			innerHeight - (top + (targetHome ? extend : 0)),
		),
	};
}

function getSiteName(): string {
	return (
		document
			.querySelector<HTMLMetaElement>('meta[property="og:site_name"]')
			?.content?.trim() || ""
	);
}

function isHomeOrPagination(path: string): boolean {
	return (
		pathsEqual(path, url("/")) || isHomePaginationPath(path, url("/page/"))
	);
}

function getImprint(visit: Visit): TransitionFrameState["imprint"] {
	const path = new URL(visit.to.url, location.href).pathname;
	const home = isHome(visit);
	const homeIndex = isHomeOrPagination(path);
	const archive = pathsEqual(path, url(getArchivePath()));
	const about = pathsEqual(path.replace(/\.html$/, ""), url("/about/"));
	let eyebrow = "ARTICLE";
	if (homeIndex) eyebrow = "HOME · INDEX";
	else if (archive) eyebrow = "ARCHIVE";
	else if (about) eyebrow = "ABOUT";
	const siteName = getSiteName();
	if (homeIndex && siteName) return { eyebrow, title: siteName };
	const link = visit.trigger.el;
	const explicitTitle =
		link?.getAttribute("data-transition-title")?.replace(/\s+/g, " ").trim() ||
		"";
	const visibleText = (link?.textContent || "").replace(/\s+/g, " ").trim();
	const ariaLabel = (link?.getAttribute("aria-label") || "")
		.replace(/\s+/g, " ")
		.trim();
	const generic =
		/^(?:上一篇|下一篇|阅读全文|阅读更多|read more|next|previous)[\s→←»«]*$/i;
	const assistiveLabel =
		/^(?:view all posts|go to |page \d+$|previous page$|next page$)/i;
	const title =
		explicitTitle ||
		(visibleText && !generic.test(visibleText) ? visibleText : "") ||
		(ariaLabel && !generic.test(ariaLabel) && !assistiveLabel.test(ariaLabel)
			? ariaLabel
			: "");
	if (title) return { eyebrow, title };
	const card = link
		?.closest(".card-base")
		?.querySelector<HTMLElement>("[data-transition-title]");
	return {
		eyebrow,
		title: card?.dataset.transitionTitle || (home ? siteName : "") || eyebrow,
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
	let scrollGuard: AbortController | undefined;
	let scrolledDuringHold = false;
	let quick = false;
	let pulsed = false;
	let replacedAt = 0;
	let slowFrames = 0;
	let sampleVisit = false;
	let warmed = false;
	let fadeVisit: Visit | undefined;
	const recentSlowVisits: boolean[] = [];
	let useFade = false;
	let bannerSyncMode: "none" | "start" | "hold" = "none";
	let holdComposited = false;
	let holdTimer = 0;
	let presentationFrame = 0;
	let skipSlowSample = false;
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

	function exitHold() {
		cancelAnimationFrame(presentationFrame);
		presentationFrame = 0;
		if (holdTimer) {
			window.clearTimeout(holdTimer);
			holdTimer = 0;
		}
		if (holdComposited) {
			renderer.leaveHold?.();
			holdComposited = false;
		}
	}

	function allowReplacementAfterPaint() {
		const gate = permit;
		if (!holdComposited || document.hidden) {
			gate.resolve();
			return;
		}
		// 缓存命中时 Swup 会在微任务里立即换页，先留出一次完整的渲染机会给驻留图层。
		presentationFrame = requestAnimationFrame(() => {
			presentationFrame = requestAnimationFrame(() => {
				presentationFrame = 0;
				gate.resolve();
			});
		});
	}

	function scheduleHoldCheck() {
		if (
			!current ||
			!holdComposited ||
			state.phase !== "holding" ||
			!replacedAt
		) {
			return;
		}
		if (holdTimer) {
			window.clearTimeout(holdTimer);
			holdTimer = 0;
		}
		const remaining = phaseStart + duration - performance.now();
		if (remaining > 0) {
			holdTimer = window.setTimeout(scheduleHoldCheck, Math.ceil(remaining));
			return;
		}
		if (!frame) frame = requestAnimationFrame(draw);
	}

	function lockUserScroll() {
		if (scrollGuard) return;
		scrollGuard = new AbortController();
		const blockScroll = (event: Event) => {
			if (event.cancelable) event.preventDefault();
		};
		for (const eventName of ["wheel", "touchmove"] as const) {
			window.addEventListener(eventName, blockScroll, {
				capture: true,
				passive: false,
				signal: scrollGuard.signal,
			});
		}
		window.addEventListener(
			"scroll",
			() => {
				if (state.phase === "holding" && !replacedAt) scrolledDuringHold = true;
			},
			{ passive: true, signal: scrollGuard.signal },
		);
	}

	function unlockUserScroll() {
		scrollGuard?.abort();
		scrollGuard = undefined;
	}

	function finish(completed = false) {
		unlockUserScroll();
		exitHold();
		skipSlowSample = false;
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
		bannerSyncMode = "none";
		const wasActive = document.documentElement.classList.contains(
			"optical-transition-active",
		);
		document.documentElement.classList.remove("optical-transition-active");
		if (wasActive) {
			document.dispatchEvent(new Event("fangyuan:optical-transition-end"));
		}
	}

	function fade(visit: Visit) {
		finish();
		fadeVisit = visit;
		document.documentElement.classList.add("optical-transition-light");
	}

	function releaseFade() {
		if (fadeVisit && !useFade) {
			document.documentElement.classList.remove("optical-transition-light");
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
		const targetHome = isHome(visit);
		const currentHome = document.body.classList.contains("lg:is-home");
		if (
			main &&
			host &&
			!host.isBannerSynced &&
			resolveBannerExtendPx() > 0 &&
			currentHome !== targetHome
		) {
			bannerSyncMode = "hold";
			const { baseTop, currentOffsetY } = resolveMainGridMetrics(main);
			const extend = resolveBannerExtendPx();
			const { startVisibleHeight, targetVisibleHeight } = computeVisibleHeights(
				baseTop,
				currentHome,
				targetHome,
			);
			host.lockToBanner(
				main,
				baseTop,
				currentOffsetY,
				targetHome ? extend : 0,
				startVisibleHeight,
				targetVisibleHeight,
			);
			Object.assign(state, host.geometry);
		}
		const holdMs =
			bannerSyncMode === "hold"
				? 300
				: bannerSyncMode === "start"
					? 220
					: quick
						? 115
						: 160;
		phase("holding", now, holdMs);
		scrolledDuringHold = false;
		state.scrollNorm = 0;
		state.scrollVelocity = 0;
		setBannerHome(targetHome);
		pulseBanner();
		if (host && main) {
			syncHoldGeometry();
			Object.assign(state, host.geometry);
			holdComposited = Boolean(renderer.enterHold?.(host, state, holdMs));
		}
		allowReplacementAfterPaint();
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
					const animation = sticky.animate(
						[{ translate: `0 ${offset}px` }, { translate: "0 0" }],
						{ duration: 180, easing: "ease-out" },
					);
					sidebarReturn = animation;
					animation.pause();
					requestAnimationFrame(() => {
						if (animation.playState === "paused") animation.play();
					});
				}
			}
		}
		if (!rollStart) return hold(visit, now);
		state.scrollNorm = 1;
		phase("rolling", now, Math.min(380, Math.max(240, rollStart * 0.7)));
	}

	function paint() {
		if (!host || !main) return false;
		host.sync(main);
		Object.assign(state, host.geometry);
		const clock = {
			origin: performance.timeOrigin + started,
			phaseStart: phaseStart - started,
			duration,
		};
		if (renderer.renderOffscreen?.(host.canvas, state, clock)) return true;
		const ctx = host.getDrawingContext();
		if (!ctx) return false;
		renderer.render(ctx, state, clock);
		return true;
	}

	function syncHoldGeometry() {
		if (!host || !main || !current) return;
		const extend = resolveBannerExtendPx();
		const gridSlide =
			extend > 0
				? document
						.getElementById("main-grid")
						?.getAnimations()
						.find(
							(animation) =>
								"transitionProperty" in animation &&
								animation.transitionProperty === "transform",
						)
				: undefined;
		if (extend > 0 && (host.isBannerSynced || gridSlide)) {
			const { baseTop, currentOffsetY } = resolveMainGridMetrics(main);
			const targetOffset = isHome(current) ? extend : 0;
			host.lockToBanner(
				main,
				baseTop,
				currentOffsetY,
				targetOffset,
				Math.max(0, innerHeight - Math.max(0, baseTop + currentOffsetY)),
				Math.max(0, innerHeight - Math.max(0, baseTop + targetOffset)),
				gridSlide,
			);
		} else {
			host.unlockBanner();
			host.sync(main);
		}
	}

	function resizeVeil() {
		if (!host || !main || !current) return;
		syncHoldGeometry();
		Object.assign(state, host.geometry);
		if (holdComposited) {
			state.elapsedSec = (performance.now() - started) / 1000;
			holdComposited = Boolean(renderer.enterHold?.(host, state, duration));
			if (!holdComposited && !frame) frame = requestAnimationFrame(draw);
		}
	}

	function draw(now: number) {
		frame = 0;
		if (!current || !host || !main || (current.done && !replacedAt))
			return finish();
		const rawElapsed = Math.max(0, now - previousTime) / 1000;
		const elapsed = skipSlowSample ? 0 : rawElapsed;
		if (
			sampleVisit &&
			!skipSlowSample &&
			previousTime !== started &&
			state.phase !== "holding" &&
			elapsed > 0.045
		)
			slowFrames++;
		skipSlowSample = false;
		state.dt = Math.min(0.034, elapsed);
		state.elapsedSec = (now - started) / 1000;
		previousTime = now;
		const effectiveNow =
			holdComposited && state.phase === "holding" && replacedAt
				? Math.max(now, performance.now())
				: now;
		const progress = Math.min(
			1,
			Math.max(0, (effectiveNow - phaseStart) / duration),
		);
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
				if (replacedAt && progress === 1) {
					if (holdComposited) {
						exitHold();
						previousTime = now;
						skipSlowSample = true;
						state.dt = 0;
					}
					const exitMs =
						bannerSyncMode === "hold"
							? 400
							: bannerSyncMode === "start"
								? 340
								: quick
									? 275
									: 350;
					phase("exiting", Math.max(phaseStart + duration, replacedAt), exitMs);
				}
				break;
			case "exiting":
				if (progress === 1) return finish(true);
				break;
		}
		if (holdComposited) {
			if (replacedAt) scheduleHoldCheck();
			return;
		}
		if (!paint()) return fade(current);
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
		const now = performance.now();
		permit.resolve();
		permit = Promise.withResolvers<void>();
		current = visit;
		replacedAt = 0;
		quick = scrollY <= 16;
		const currentHome = document.body.classList.contains("lg:is-home");
		const targetHome = isHome(visit);
		const bannerChanging =
			resolveBannerExtendPx() > 0 && currentHome !== targetHome;
		state.imprint = getImprint(visit);
		if (!continuing) {
			if (quick && bannerChanging) {
				bannerSyncMode = "start";
				const { baseTop, currentOffsetY } = resolveMainGridMetrics(main);
				const extend = resolveBannerExtendPx();
				const { startVisibleHeight, targetVisibleHeight } =
					computeVisibleHeights(baseTop, currentHome, targetHome);
				host.lockToBanner(
					main,
					baseTop,
					currentOffsetY,
					targetHome ? extend : 0,
					startVisibleHeight,
					targetVisibleHeight,
				);
			} else {
				bannerSyncMode = "none";
				host.sync(main);
			}
			Object.assign(state, host.geometry);
			try {
				renderer.prepare({ mainElement: main, ...host.geometry });
			} catch {
				return fade(visit);
			}
			started = previousTime = performance.now();
			state.elapsedSec = 0;
			state.dt = 0;
			state.scrollNorm = quick ? 0 : 1;
			state.scrollVelocity = 0;
			phase(
				"entering",
				started,
				bannerSyncMode === "start" ? 240 : quick ? 160 : 205,
			);
		} else {
			if (host.isBannerSynced) {
				const { baseTop } = resolveMainGridMetrics(main);
				const extend = resolveBannerExtendPx();
				const { targetVisibleHeight } = computeVisibleHeights(
					baseTop,
					currentHome,
					targetHome,
				);
				host.retargetBanner(targetHome ? extend : 0, targetVisibleHeight);
			}
			if (state.phase === "exiting") {
				phase("entering", now, Math.max(32, 160 * state.phaseProgress));
			} else if (state.phase === "holding") {
				exitHold();
				previousTime = now;
				skipSlowSample = true;
				close(visit, now);
			}
		}
		if (!holdComposited && !paint()) {
			useFade = true;
			return fade(visit);
		}
		visit.animation.selector = false;
		visit.scroll.animate = false;
		lockUserScroll();
		document.documentElement.classList.add("optical-transition-active");
		if (!targetHome || quick) {
			setBannerHome(targetHome);
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
			if (holdComposited && !frame) frame = requestAnimationFrame(draw);
		}
	});
	swup.hooks.on("visit:end", (visit) => {
		if (visit === fadeVisit) releaseFade();
		if (visit === current && holdComposited && !replacedAt && !frame) {
			frame = requestAnimationFrame(draw);
		}
	});
	swup.hooks.before("content:scroll", (visit) => {
		if (visit === current) visit.scroll.scrolledToContent = true;
		if (!visit.to.hash && !visit.scroll.target) visit.scroll.animate = false;
	});
	swup.hooks.before("content:replace", (visit) => {
		if (visit !== current) return;
		const incoming = visit.to.document?.getElementById("swup-container");
		if (incoming) incoming.dataset.opticalRevealed = "";
		if (scrolledDuringHold) window.scrollTo({ top: 0, behavior: "instant" });
	});
	swup.hooks.on("content:replace", (visit) => {
		if (visit === fadeVisit) {
			setBannerHome(isHome(visit));
		}
		if (visit !== current) return;
		main = document.getElementById("swup-container");
		if (!main) return finish();
		const targetPath = new URL(visit.to.url, location.href).pathname;
		state.imprint.title =
			(isHomeOrPagination(targetPath) ? getSiteName() : "") ||
			main.dataset.swupAnnouncement?.trim() ||
			document.title;
		setBannerHome(isHome(visit));
		pulseBanner();
		replacedAt = performance.now();
		state.dt = 0;
		if (holdComposited) scheduleHoldCheck();
	});
	motion.addEventListener("change", () => {
		if (!motion.matches || !current) return;
		setBannerHome(isHome(current));
		finish();
	});
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) {
			sampleVisit = false;
			if (presentationFrame) {
				cancelAnimationFrame(presentationFrame);
				presentationFrame = 0;
				permit.resolve();
			}
		}
	});
	window.addEventListener("resize", resizeVeil);
	window.addEventListener("pagehide", () => finish());
}
