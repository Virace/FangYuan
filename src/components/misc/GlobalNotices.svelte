<script lang="ts">
import { type Notice, notices } from "@utils/browser/notifications";
import { onMount, tick } from "svelte";
import type { NotificationConfig } from "@/types/config";
import NoticeItem from "./NoticeItem.svelte";

export let closeLabel: string;
export let pinnedLabel: string;
export let regionLabel: string;
export let placement: NotificationConfig;
let rendered: Notice[] = [];
let polite: { id: number; message: string } | null = null;
let urgent: { id: number; message: string } | null = null;
let layer: HTMLElement;

onMount(() => {
	const announced = new Set<number>();
	let alive = true;
	let lastTick = performance.now();
	const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
	notices.setPlacement(placement);
	function resize() {
		const viewport = window.visualViewport;
		const viewportTop = viewport?.offsetTop ?? 0;
		const viewportBottom =
			viewportTop + (viewport?.height ?? window.innerHeight);
		const navbar = document.getElementById("navbar")?.getBoundingClientRect();
		const footer = document.querySelector(".footer")?.getBoundingClientRect();
		const top = Math.max(viewportTop + 88, (navbar?.bottom ?? 72) + 16);
		const bottom = Math.min(
			viewportBottom - 48,
			(footer?.top ?? Number.POSITIVE_INFINITY) - 16,
		);
		const height = Math.max(0, bottom - top);
		layer.style.setProperty("--notice-top", `${top}px`);
		layer.style.setProperty(
			"--notice-bottom",
			`${window.innerHeight - bottom}px`,
		);
		layer.style.setProperty("--notice-height", `${height}px`);
		notices.setCapacity(height, 10, motion.matches);
	}
	const unsubscribe = notices.subscribe((snapshot) => {
		rendered = [
			...snapshot.visible,
			...(snapshot.candidate ? [snapshot.candidate] : []),
		];
		const normalMessages: string[] = [];
		const errorMessages: string[] = [];
		let latestId = 0;
		for (const notice of snapshot.visible) {
			if (notice.phase === "leaving" || announced.has(notice.id)) continue;
			announced.add(notice.id);
			const message = `${notice.message} ${notice.description}`.trim();
			latestId = notice.id;
			if (notice.tone === "error") errorMessages.push(message);
			else normalMessages.push(message);
		}
		if (normalMessages.length)
			polite = { id: latestId, message: normalMessages.join("\n") };
		if (errorMessages.length)
			urgent = { id: latestId, message: errorMessages.join("\n") };
	});
	resize();
	let resizeFrame = 0;
	function scheduleResize() {
		if (resizeFrame) return;
		resizeFrame = requestAnimationFrame(() => {
			resizeFrame = 0;
			resize();
		});
	}
	const boundsObserver = new ResizeObserver(scheduleResize);
	const content = document.getElementById("main-grid");
	if (content) boundsObserver.observe(content);
	const interval = window.setInterval(() => {
		const now = performance.now();
		notices.tick(now - lastTick, !document.hidden);
		lastTick = now;
	}, 50);
	function visibility() {
		lastTick = performance.now();
	}
	async function focusAfterClose(event: MouseEvent) {
		const target = event.target as Element;
		if (!target.closest(".global-notice-close")) return;
		await tick();
		// 鼠标关闭不抢焦点；键盘关闭时将焦点交给相邻关闭按钮。
		if (event.detail === 0)
			layer
				.querySelector<HTMLButtonElement>(
					'.global-notice:not([data-phase="leaving"]) .global-notice-close',
				)
				?.focus({ preventScroll: true });
	}
	layer.addEventListener("click", focusAfterClose);
	window.addEventListener("resize", scheduleResize);
	window.addEventListener("scroll", scheduleResize, { passive: true });
	window.visualViewport?.addEventListener("resize", scheduleResize);
	window.visualViewport?.addEventListener("scroll", scheduleResize);
	motion.addEventListener("change", resize);
	document.addEventListener("visibilitychange", visibility);
	void document.fonts.ready.then(() => {
		if (alive) resize();
	});
	return () => {
		alive = false;
		unsubscribe();
		clearInterval(interval);
		cancelAnimationFrame(resizeFrame);
		boundsObserver.disconnect();
		layer.removeEventListener("click", focusAfterClose);
		window.removeEventListener("resize", scheduleResize);
		window.removeEventListener("scroll", scheduleResize);
		window.visualViewport?.removeEventListener("resize", scheduleResize);
		window.visualViewport?.removeEventListener("scroll", scheduleResize);
		motion.removeEventListener("change", resize);
		document.removeEventListener("visibilitychange", visibility);
	};
});
</script>

<aside bind:this={layer} class="global-notices" data-position={placement.position} aria-label={regionLabel}>
	{#each rendered as notice (notice.id)}
		<NoticeItem {notice} position={placement.position} {closeLabel} {pinnedLabel} />
	{/each}
</aside>
<span class="sr-only" role="status" aria-live="polite" aria-atomic="true">{#if polite}{#key polite.id}<span>{polite.message}</span>{/key}{/if}</span>
<span class="sr-only" role="alert" aria-atomic="true">{#if urgent}{#key urgent.id}<span>{urgent.message}</span>{/key}{/if}</span>
