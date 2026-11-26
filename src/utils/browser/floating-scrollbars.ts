type Axis = "horizontal" | "vertical";

export const floatingScrollbarMedia =
	"(any-pointer: fine) and (forced-colors: none)";

function createRail(
	host: HTMLElement,
	viewport: HTMLElement,
	axis: Axis,
	signal: AbortSignal,
) {
	const vertical = axis === "vertical";
	const rail = document.createElement("div");
	const track = document.createElement("div");
	const handle = document.createElement("div");
	rail.className = `floating-scrollbar ${axis}`;
	rail.setAttribute("aria-hidden", "true");
	rail.hidden = true;
	track.className = "floating-scroll-track";
	handle.className = "floating-scroll-handle";
	track.append(handle);
	rail.append(track);
	host.append(rail);
	let extent = 0;
	let rtl = false;
	let drag:
		| { pointer: number; start: number; scroll: number; ratio: number }
		| undefined;
	const offset = () => (vertical ? viewport.scrollTop : viewport.scrollLeft);
	const coordinate = (event: PointerEvent) =>
		vertical ? event.clientY : event.clientX;

	function position() {
		if (!extent) return;
		const progress = (rtl ? 1 : 0) + offset() / extent;
		handle.style.setProperty(
			"--scroll-progress",
			String(Math.max(0, Math.min(1, progress))),
		);
	}
	handle.addEventListener(
		"pointerdown",
		(event) => {
			if (!event.isPrimary || event.button !== 0) return;
			const travel = vertical
				? track.clientHeight - handle.offsetHeight
				: track.clientWidth - handle.offsetWidth;
			if (travel <= 0) return;
			drag = {
				pointer: event.pointerId,
				start: coordinate(event),
				scroll: offset(),
				ratio: extent / travel,
			};
			handle.setPointerCapture(event.pointerId);
			event.preventDefault();
		},
		{ signal },
	);
	handle.addEventListener(
		"pointermove",
		(event) => {
			if (!drag || drag.pointer !== event.pointerId) return;
			const value = drag.scroll + (coordinate(event) - drag.start) * drag.ratio;
			viewport.scrollTo(
				vertical
					? { top: value, behavior: "instant" }
					: { left: value, behavior: "instant" },
			);
		},
		{ signal },
	);
	handle.addEventListener(
		"lostpointercapture",
		() => {
			drag = undefined;
		},
		{ signal },
	);
	signal.addEventListener("abort", () => rail.remove(), { once: true });
	return {
		rail,
		position,
		get interacting() {
			return Boolean(drag) || rail.matches(":hover");
		},
		measure(total: number, visible: number, direction: string) {
			extent = Math.max(0, total - visible);
			rtl = !vertical && direction === "rtl";
			rail.hidden = !extent;
			if (extent) {
				handle.style.setProperty(
					"--scroll-length",
					`${(100 * visible) / total}%`,
				);
				position();
			}
		},
	};
}

function attachScrollbars(
	viewport: HTMLElement,
	host: HTMLElement,
	content: Element,
	signal: AbortSignal,
) {
	const documentScroll = viewport === document.documentElement;
	viewport.classList.add("floating-scroll-viewport");
	const horizontal = createRail(host, viewport, "horizontal", signal);
	const vertical = documentScroll
		? createRail(host, viewport, "vertical", signal)
		: undefined;
	const rails = vertical ? [horizontal, vertical] : [horizontal];
	let hideTimer = 0;
	let wheelTimer = 0;
	function measure() {
		const width = viewport.clientWidth;
		const fullWidth = viewport.scrollWidth;
		const height = vertical ? viewport.clientHeight : 0;
		const fullHeight = vertical ? viewport.scrollHeight : 0;
		const direction = getComputedStyle(viewport).direction;
		horizontal.measure(fullWidth, width, direction);
		vertical?.measure(fullHeight, height, direction);
		if (!documentScroll) viewport.tabIndex = fullWidth > width ? 0 : -1;
	}
	function wake() {
		for (const { rail } of rails) rail.classList.add("is-visible");
		clearTimeout(hideTimer);
		hideTimer = window.setTimeout(() => {
			if (
				rails.some((rail) => rail.interacting) ||
				(!documentScroll && host.matches(":hover, :focus-within"))
			)
				return;
			for (const { rail } of rails) rail.classList.remove("is-visible");
		}, 500);
	}
	const scrollTarget = documentScroll ? window : viewport;
	scrollTarget.addEventListener(
		"scroll",
		() => {
			for (const rail of rails) rail.position();
			wake();
		},
		{ passive: true, signal },
	);
	for (const { rail } of rails) {
		rail.addEventListener("pointerleave", wake, { signal });
		rail.addEventListener("lostpointercapture", wake, { signal });
		if (documentScroll)
			rail.addEventListener(
				"wheel",
				(event) => {
					rail.classList.add("pass-wheel");
					event.preventDefault();
					clearTimeout(wheelTimer);
					wheelTimer = window.setTimeout(() => {
						for (const axis of rails) axis.rail.classList.remove("pass-wheel");
					}, 333);
				},
				{ passive: false, signal },
			);
	}
	if (documentScroll) {
		const direction = new MutationObserver(measure);
		direction.observe(viewport, { attributes: true, attributeFilter: ["dir"] });
		signal.addEventListener("abort", () => direction.disconnect(), {
			once: true,
		});
		document.addEventListener(
			"pointermove",
			(event) => {
				if (event.pointerType !== "touch") wake();
			},
			{ passive: true, signal },
		);
		window.addEventListener("resize", measure, { signal });
		content.addEventListener(
			"transitionend",
			(event) => {
				if (
					event.target === content &&
					(event as TransitionEvent).propertyName === "transform"
				)
					measure();
			},
			{ signal },
		);
	} else {
		for (const event of ["pointerenter", "pointerleave", "focusin", "focusout"])
			host.addEventListener(event, wake, { signal });
	}
	const sizes = new ResizeObserver(measure);
	sizes.observe(content);
	sizes.observe(documentScroll ? host : viewport);
	signal.addEventListener(
		"abort",
		() => {
			sizes.disconnect();
			clearTimeout(hideTimer);
			clearTimeout(wheelTimer);
			viewport.classList.remove("floating-scroll-viewport");
			if (!documentScroll) viewport.tabIndex = 0;
		},
		{ once: true },
	);
	measure();
}

function hasClassicScrollbars(): boolean {
	const probe = document.createElement("div");
	probe.style.cssText =
		"position:fixed;visibility:hidden;width:64px;height:64px;overflow:scroll;scrollbar-width:auto";
	document.body.append(probe);
	const classic =
		probe.offsetWidth > probe.clientWidth &&
		probe.offsetHeight > probe.clientHeight;
	probe.remove();
	return classic;
}

export function initFloatingScrollbars(): () => void {
	const desktop = matchMedia(floatingScrollbarMedia);
	let documentEvents: AbortController | undefined;
	let formulaEvents: AbortController | undefined;
	function refreshFormulas() {
		formulaEvents?.abort();
		if (!documentEvents) {
			for (const viewport of document.querySelectorAll<HTMLElement>(
				"main .katex-display > .katex:not([tabindex])",
			))
				viewport.tabIndex = 0;
			return;
		}
		const formulas = document.querySelectorAll<HTMLElement>(
			"main .katex-display",
		);
		if (!formulas.length) return;
		formulaEvents = new AbortController();
		const { signal } = formulaEvents;
		const near = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting || signal.aborted) continue;
					const host = entry.target as HTMLElement;
					const viewport = host.querySelector<HTMLElement>(":scope > .katex");
					const content = viewport?.querySelector(":scope > .katex-html");
					if (viewport && content)
						attachScrollbars(viewport, host, content, signal);
					near.unobserve(host);
				}
			},
			{ rootMargin: "100px" },
		);
		for (const host of formulas) near.observe(host);
		signal.addEventListener("abort", () => near.disconnect(), { once: true });
	}
	function configure() {
		documentEvents?.abort();
		documentEvents = undefined;
		const grid = document.getElementById("main-grid");
		if (
			grid &&
			desktop.matches &&
			CSS.supports("scrollbar-width", "none") &&
			hasClassicScrollbars()
		) {
			documentEvents = new AbortController();
			attachScrollbars(
				document.documentElement,
				document.body,
				grid,
				documentEvents.signal,
			);
		}
		refreshFormulas();
	}
	desktop.addEventListener("change", configure);
	configure();
	return refreshFormulas;
}
