<script lang="ts">
import type { Notice } from "@utils/browser/notifications";
import { notices } from "@utils/browser/notifications";

export let notice: Notice;
export let closeLabel: string;
export let pinnedLabel: string;
export let position: "top" | "bottom";
let compact = true;
let card: HTMLElement;

function place(node: HTMLElement, value: { offset: number; pending: boolean }) {
	let frame = 0;
	let settled = false;
	node.style.transition = "none";
	// 首次测量与准入先直达槽位，后续只有已有卡片参与纵向让位。
	function update({ offset, pending }: typeof value) {
		node.style.transform = `translateY(${offset}px)`;
		if (pending) {
			cancelAnimationFrame(frame);
			node.style.transition = "none";
			settled = false;
		} else if (!settled) {
			settled = true;
			frame = requestAnimationFrame(() => {
				frame = requestAnimationFrame(() =>
					node.style.removeProperty("transition"),
				);
			});
		}
	}
	update(value);
	return {
		update,
		destroy() {
			cancelAnimationFrame(frame);
		},
	};
}

const paths = {
	success: "m7 12 3 3 7-7",
	info: "M12 11v6M12 7h.01",
	warning: "M12 8v5M12 17h.01",
	error: "M12 7v6M12 17h.01",
	announcement:
		"m3 10 12-5v14L3 14v-4ZM15 9h2a3 3 0 0 1 0 6h-2M5 15l1 6h3l-1-5",
};

function measure(node: HTMLElement) {
	let frame = 0;
	let alive = true;
	function report() {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(() => {
			if (!alive) return;
			const lines = [
				...node.querySelectorAll<HTMLElement>(
					".global-notice-message, .global-notice-description",
				),
			].reduce(
				(total, element) =>
					total +
					Math.round(
						element.offsetHeight /
							Number.parseFloat(getComputedStyle(element).lineHeight),
					),
				0,
			);
			compact = lines <= 2;
			notices.setHeight(notice.id, node.offsetHeight);
		});
	}
	const observer = new ResizeObserver(report);
	observer.observe(node);
	const text = node.querySelector(".global-notice-text");
	if (text) observer.observe(text);
	void document.fonts.ready.then(report);
	report();
	return {
		destroy() {
			alive = false;
			observer.disconnect();
			cancelAnimationFrame(frame);
		},
	};
}
</script>

<div class="global-notice-position" use:place={{ offset: position === "top" ? notice.offset : -notice.offset, pending: notice.phase === "pending" }} data-measuring={notice.phase === "pending"}>
	<section
		bind:this={card}
		use:measure
		class="global-notice"
		data-notice-id={notice.id}
		data-tone={notice.tone}
		data-icon={notice.icon ?? notice.tone}
		data-phase={notice.phase}
		data-compact={compact}
		aria-label={notice.message}
		aria-hidden={notice.phase === "pending" ? "true" : undefined}
		on:mouseenter={() => notices.setPaused(notice.id, "hovered", true)}
		on:mouseleave={() => notices.setPaused(notice.id, "hovered", false)}
		on:focusin={() => notices.setPaused(notice.id, "focused", true)}
		on:focusout={(event) => { if (!card.contains(event.relatedTarget as Node | null)) notices.setPaused(notice.id, "focused", false); }}
	>
		<span class="global-notice-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24">
				{#if !notice.icon && notice.tone !== "warning"}<circle cx="12" cy="12" r="9" />{/if}
				{#if notice.tone === "warning" && !notice.icon}<path d="m10.4 4.5-8 13.8A1.8 1.8 0 0 0 4 21h16a1.8 1.8 0 0 0 1.6-2.7l-8-13.8a1.85 1.85 0 0 0-3.2 0Z" />{/if}
				<path d={paths[notice.icon ?? notice.tone]} />
			</svg>
		</span>
		<div class="global-notice-text">
			<p class="global-notice-message">{notice.message}{#if notice.priority === "important"}<span class="global-notice-pin" role="img" aria-label={pinnedLabel}><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1.5 10.5 6 6 10.5 1.5 6Z" fill="currentColor" stroke="none" /></svg></span>{/if}</p>
			{#if notice.description}<p class="global-notice-description">{notice.description}</p>{/if}
		</div>
		<button type="button" class="global-notice-close" aria-label={`${closeLabel}: ${notice.message}`} on:click={() => notices.dismiss(notice.id)}>
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
		</button>
	</section>
</div>
