<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import {
	type BeamTarget,
	clamp01,
	clearCanvas,
	easePrinterSweep,
	prefersReducedMotion,
	renderLaserPrintOverlay,
	renderProjectionBeams,
	resolveRewardAccent,
	type ScanDirection,
} from "@utils/browser/reward-projection";
import type { RewardOption } from "@utils/page-feedback/provider";
import { onDestroy, tick } from "svelte";

export let open = false;
export let options: RewardOption[] = [];
export let triggerEl: HTMLElement | null = null;
export let emitterEls: Array<HTMLElement | null> = [];
export let onClose: (() => void) | null = null;

type AnimationPhase = "closed" | "opening" | "settled" | "rescan" | "closing";
type Placement = "above" | "below";

let layerEl: HTMLDivElement | null = null;
let cardEl: HTMLDivElement | null = null;
let beamCanvasEl: HTMLCanvasElement | null = null;
let frameEls: Record<string, HTMLElement | null> = {};
let scanCanvasEls: Record<string, HTMLCanvasElement | null> = {};

let activeRewardId = "";
let hasOpenedOnce = false;
let layerVisible = false;
let panelActive = false;
let placement: Placement = "above";
let cardStyle = "";
let phase: AnimationPhase = "closed";
let rafId = 0;
let closeTimer: ReturnType<typeof setTimeout> | null = null;
let animStartTime = 0;

let mountedRewardIds: ReadonlySet<string> = new Set();
let presentedRewardIds: ReadonlySet<string> = new Set();
let scanProgressById: Record<string, number> = {};

$: isDualLayout = options.length === 2;
$: hasTabs = options.length >= 3;

$: if (
	options.length > 0 &&
	!options.some((option) => option.id === activeRewardId)
) {
	activeRewardId = options[0].id;
}

$: visibleOptions = isDualLayout
	? options
	: options.filter((option) => option.id === activeRewardId).slice(0, 1);

$: activeTabIndex = Math.max(
	0,
	options.findIndex((option) => option.id === activeRewardId),
);

$: if (open) {
	mountVisibleImages(visibleOptions);
}

$: if (open && (!layerVisible || phase === "closing") && options.length > 0) {
	void openProjection();
}

$: if (!open && layerVisible && phase !== "closing") {
	closeProjection(false);
}

function mountVisibleImages(list: readonly RewardOption[]) {
	let changed = false;
	const next = new Set(mountedRewardIds);
	for (const option of list) {
		if (option.image && !next.has(option.id)) {
			next.add(option.id);
			changed = true;
		}
	}
	if (changed) {
		mountedRewardIds = next;
	}
}

function presentRewardImage(id: string) {
	if (presentedRewardIds.has(id)) {
		return;
	}
	presentedRewardIds = new Set(presentedRewardIds).add(id);
}

function showTopLayer() {
	if (!layerEl) {
		return;
	}
	try {
		if (
			typeof layerEl.showPopover === "function" &&
			!layerEl.matches(":popover-open")
		) {
			layerEl.showPopover();
		}
	} catch {
		// 某些环境不支持 Popover API 时退化为固定定位显示
	}
}

function hideTopLayer() {
	if (!layerEl) {
		return;
	}
	try {
		if (
			typeof layerEl.hidePopover === "function" &&
			layerEl.matches(":popover-open")
		) {
			layerEl.hidePopover();
		}
	} catch {
		// 忽略已关闭状态
	}
}

function updateCardPosition(): boolean {
	if (!cardEl || typeof window === "undefined") {
		return false;
	}

	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const cardWidth = cardEl.offsetWidth || (isDualLayout ? 396 : 232);
	const cardHeight = cardEl.offsetHeight || 268;
	const margin = 12;
	const gap = 22;

	if (!triggerEl) {
		placement = "above";
		const left = Math.max(margin, (viewportWidth - cardWidth) / 2);
		const top = Math.max(margin, (viewportHeight - cardHeight) / 2);
		cardStyle = `left:${Math.round(left)}px;top:${Math.round(top)}px;`;
		return true;
	}

	const triggerRect = triggerEl.getBoundingClientRect();
	if (triggerRect.bottom < 0 || triggerRect.top > viewportHeight) {
		return false;
	}

	const spaceAbove = triggerRect.top - margin;
	const spaceBelow = viewportHeight - triggerRect.bottom - margin;
	const shouldPlaceBelow =
		spaceAbove < cardHeight + gap && spaceBelow > spaceAbove;
	placement = shouldPlaceBelow ? "below" : "above";

	let top = shouldPlaceBelow
		? triggerRect.bottom + gap
		: triggerRect.top - cardHeight - gap;
	top = Math.max(margin, Math.min(viewportHeight - cardHeight - margin, top));

	let left = triggerRect.left + triggerRect.width / 2 - cardWidth / 2;
	left = Math.max(margin, Math.min(viewportWidth - cardWidth - margin, left));

	cardStyle = `left:${Math.round(left)}px;top:${Math.round(top)}px;`;
	return true;
}

function getScanDirection(): ScanDirection {
	return placement === "below" ? "down" : "up";
}

function getClipPathForProgress(progress: number | undefined): string {
	if (progress === undefined || progress >= 0.992) {
		return "none";
	}
	const clamped = clamp01(progress);
	const hiddenPct = ((1 - clamped) * 100).toFixed(2);
	return placement === "below"
		? `inset(0 0 ${hiddenPct}% 0)`
		: `inset(${hiddenPct}% 0 0 0)`;
}

function buildBeamTarget(
	option: RewardOption,
	index: number,
	scanProgress: number,
	intensity: number,
	direction: ScanDirection,
): BeamTarget | null {
	const fallbackEye = emitterEls[0] ?? triggerEl;
	const frameEl = frameEls[option.id];
	if (!fallbackEye || !frameEl) {
		return null;
	}
	const eyeEl =
		(isDualLayout ? emitterEls[index] : emitterEls[0]) ?? fallbackEye;
	return {
		eyeEl,
		frameEl,
		accent: resolveRewardAccent(option.id, option.name),
		scanProgress,
		intensity,
		direction,
	};
}

function clearAllScanCanvases() {
	clearCanvas(beamCanvasEl);
	for (const canvas of Object.values(scanCanvasEls)) {
		clearCanvas(canvas);
	}
}

function stopAnimation() {
	if (rafId) {
		cancelAnimationFrame(rafId);
		rafId = 0;
	}
	if (closeTimer) {
		clearTimeout(closeTimer);
		closeTimer = null;
	}
}

function setAllScanProgress(value: number) {
	const next: Record<string, number> = {};
	for (const option of visibleOptions) {
		next[option.id] = value;
	}
	scanProgressById = next;
}

function runProjectionAnimation(nextPhase: "opening" | "rescan") {
	stopAnimation();
	phase = nextPhase;

	if (prefersReducedMotion()) {
		clearAllScanCanvases();
		setAllScanProgress(1);
		phase = "settled";
		return;
	}

	animStartTime = performance.now();
	const isDark = document.documentElement.classList.contains("dark");
	const direction = getScanDirection();

	const tickFrame = (now: number) => {
		const elapsed = now - animStartTime;

		if (phase === "opening") {
			// 先让浮层完整展开（约 210ms），再逐行匀速感扫描打印，确保肉眼完整看到过程
			const cardSettleDelay = 210;
			const scanDuration = 1080;
			const stagger = 150;
			const beamTail = 220;
			const lastIndex = Math.max(0, visibleOptions.length - 1);
			const totalDuration =
				cardSettleDelay + lastIndex * stagger + scanDuration + beamTail;

			const beamTargets: BeamTarget[] = [];
			const nextProgress: Record<string, number> = { ...scanProgressById };

			visibleOptions.forEach((option, index) => {
				const startAt = cardSettleDelay + index * stagger;
				const localElapsed = elapsed - startAt;
				const raw = clamp01(localElapsed / scanDuration);
				const swept = easePrinterSweep(raw);
				nextProgress[option.id] = swept;

				// 浮层展开尾声预点火，扫描全程稳定照亮，到达顶部后柔和熄灭
				const ignite = clamp01((elapsed - (startAt - 90)) / 130);
				const fadeOut =
					1 - clamp01((localElapsed - (scanDuration - 60)) / beamTail);
				const beamIntensity = Math.min(ignite, fadeOut);

				const target = buildBeamTarget(
					option,
					index,
					swept,
					beamIntensity,
					direction,
				);
				if (target) {
					beamTargets.push(target);
				}

				const scanCanvas = scanCanvasEls[option.id];
				if (scanCanvas) {
					renderLaserPrintOverlay(
						scanCanvas,
						swept,
						resolveRewardAccent(option.id, option.name),
						now,
						direction,
					);
				}
			});

			scanProgressById = nextProgress;
			if (beamCanvasEl) {
				renderProjectionBeams(beamCanvasEl, beamTargets, isDark);
			}

			if (elapsed < totalDuration) {
				rafId = requestAnimationFrame(tickFrame);
			} else {
				phase = "settled";
				rafId = 0;
				setAllScanProgress(1);
				clearAllScanCanvases();
			}
			return;
		}

		if (phase === "rescan") {
			const scanDuration = 760;
			const beamTail = 180;
			const totalDuration = scanDuration + beamTail;
			const raw = clamp01(elapsed / scanDuration);
			const swept = easePrinterSweep(raw);
			const ignite = clamp01(elapsed / 100);
			const fadeOut = 1 - clamp01((elapsed - (scanDuration - 50)) / beamTail);
			const beamIntensity = Math.min(ignite, fadeOut);

			const beamTargets: BeamTarget[] = [];
			const nextProgress: Record<string, number> = { ...scanProgressById };

			visibleOptions.forEach((option, index) => {
				nextProgress[option.id] = swept;
				const target = buildBeamTarget(
					option,
					index,
					swept,
					beamIntensity,
					direction,
				);
				if (target) {
					beamTargets.push(target);
				}
				const scanCanvas = scanCanvasEls[option.id];
				if (scanCanvas) {
					renderLaserPrintOverlay(
						scanCanvas,
						swept,
						resolveRewardAccent(option.id, option.name),
						now,
						direction,
					);
				}
			});

			scanProgressById = nextProgress;
			if (beamCanvasEl) {
				renderProjectionBeams(beamCanvasEl, beamTargets, isDark);
			}

			if (elapsed < totalDuration) {
				rafId = requestAnimationFrame(tickFrame);
			} else {
				phase = "settled";
				rafId = 0;
				setAllScanProgress(1);
				clearAllScanCanvases();
			}
			return;
		}
	};

	rafId = requestAnimationFrame(tickFrame);
}

async function openProjection() {
	stopAnimation();
	hasOpenedOnce = true;
	mountVisibleImages(visibleOptions);
	setAllScanProgress(prefersReducedMotion() ? 1 : 0);
	layerVisible = true;
	panelActive = false;

	await tick();
	showTopLayer();
	updateCardPosition();
	attachGlobalListeners();

	requestAnimationFrame(() => {
		if (!layerVisible) {
			return;
		}
		updateCardPosition();
		panelActive = true;
		runProjectionAnimation("opening");
	});
}

function closeProjection(notify = true) {
	if (!layerVisible || phase === "closing") {
		return;
	}
	detachGlobalListeners();
	stopAnimation();
	clearAllScanCanvases();
	panelActive = false;
	phase = "closing";
	if (notify) {
		onClose?.();
	}
	if (prefersReducedMotion()) {
		finishClose();
		return;
	}
	closeTimer = setTimeout(() => {
		closeTimer = null;
		finishClose();
	}, 190);
}

function finishClose() {
	stopAnimation();
	clearAllScanCanvases();
	hideTopLayer();
	layerVisible = false;
	panelActive = false;
	phase = "closed";
}

function handleSwitchOption(nextId: string) {
	if (nextId === activeRewardId) {
		return;
	}
	activeRewardId = nextId;
	const target = options.find((option) => option.id === nextId);
	if (target) {
		mountVisibleImages([target]);
	}
	void tick().then(() => {
		if (!layerVisible || phase === "closing") {
			return;
		}
		updateCardPosition();
		runProjectionAnimation("rescan");
	});
}

function handleDocumentPointerDown(event: PointerEvent) {
	if (!layerVisible || phase === "closing") {
		return;
	}
	const targetNode = event.target as Node | null;
	if (!targetNode) {
		return;
	}
	if (cardEl?.contains(targetNode) || triggerEl?.contains(targetNode)) {
		return;
	}
	closeProjection(true);
}

function handleDocumentKeyDown(event: KeyboardEvent) {
	if (event.key === "Escape" && layerVisible && phase !== "closing") {
		event.preventDefault();
		closeProjection(true);
		triggerEl?.focus();
	}
}

function handleViewportChange() {
	if (!layerVisible || phase === "closing") {
		return;
	}
	const visible = updateCardPosition();
	if (!visible) {
		closeProjection(true);
	}
}

function attachGlobalListeners() {
	if (typeof window === "undefined") {
		return;
	}
	document.addEventListener("pointerdown", handleDocumentPointerDown, true);
	document.addEventListener("keydown", handleDocumentKeyDown);
	window.addEventListener("scroll", handleViewportChange, {
		capture: true,
		passive: true,
	});
	window.addEventListener("resize", handleViewportChange, { passive: true });
}

function detachGlobalListeners() {
	if (typeof window === "undefined") {
		return;
	}
	document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
	document.removeEventListener("keydown", handleDocumentKeyDown);
	window.removeEventListener("scroll", handleViewportChange, true);
	window.removeEventListener("resize", handleViewportChange);
}

onDestroy(() => {
	detachGlobalListeners();
	stopAnimation();
	clearAllScanCanvases();
	hideTopLayer();
});
</script>

<div
	bind:this={layerEl}
	popover="manual"
	class="reward-projection-layer"
	data-visible={layerVisible ? "true" : "false"}
>
	{#if hasOpenedOnce}
		<div
			bind:this={cardEl}
			role="dialog"
			aria-label={i18n(I18nKey.pageFeedbackReward)}
			aria-hidden={!layerVisible}
			class="reward-projection-card"
			data-open={panelActive ? "true" : "false"}
			data-scanning={phase === "opening" || phase === "rescan" ? "true" : "false"}
			data-placement={placement}
			data-layout={isDualLayout ? "dual" : "single"}
			style={cardStyle}
		>
			<div class="reward-qr-grid" data-layout={isDualLayout ? "dual" : "single"}>
				{#each visibleOptions as option (option.id)}
					{@const accent = resolveRewardAccent(option.id, option.name)}
					<div
						class="reward-qr-slot"
						style={`--reward-slot-accent:${accent.main};--reward-slot-bright:${accent.bright};`}
					>
						<div bind:this={frameEls[option.id]} class="reward-qr-frame">
							{#if option.image && mountedRewardIds.has(option.id)}
								<img
									class="reward-qr-image"
									class:reward-qr-image-presented={presentedRewardIds.has(option.id)}
									style={`clip-path:${getClipPathForProgress(scanProgressById[option.id])};`}
									src={option.image}
									alt={option.alt ?? option.name}
									on:load={() => presentRewardImage(option.id)}
									on:error={() => presentRewardImage(option.id)}
								/>
							{/if}
							<canvas
								bind:this={scanCanvasEls[option.id]}
								class="reward-scan-canvas"
								aria-hidden="true"
							></canvas>
						</div>
						<div class="reward-qr-label">
							<span class="reward-qr-label-dot" aria-hidden="true"></span>
							<span>{option.name}</span>
						</div>
					</div>
				{/each}
			</div>

			{#if hasTabs}
				<div
					class="reward-tabs"
					style={`--reward-tab-count:${options.length};--reward-tab-index:${activeTabIndex};`}
				>
					<span class="reward-tab-pill" aria-hidden="true"></span>
					{#each options as option (option.id)}
						<button
							type="button"
							class="reward-tab-btn"
							data-active={option.id === activeRewardId ? "true" : "false"}
							on:click={() => handleSwitchOption(option.id)}
						>
							{option.name}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<canvas
		bind:this={beamCanvasEl}
		class="reward-beam-canvas"
		aria-hidden="true"
	></canvas>
</div>
