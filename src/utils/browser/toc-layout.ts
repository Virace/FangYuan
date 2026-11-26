export type TocLayoutMode = "outside" | "inside";

export interface TocHeadingMetric {
	/** 相对顶级标题的缩进层级（0 为顶级，1 为次级，2 为三级） */
	levelOffset: number;
	/** 按当前目录字体测得的单行文本宽度（px） */
	textWidth: number;
}

export interface TocLayoutInput {
	/** 视口宽度（px） */
	viewportWidth: number;
	/** 文章主容器右侧到视口右缘可用于外部目录的净宽度（px） */
	availableOutsideWidth: number;
	/** 当前文章各目录条目的宽度测量结果 */
	headings: TocHeadingMetric[];
	/** 上一次布局模式，用于在临界点施加滞回防抖 */
	previousMode?: TocLayoutMode;
}

export interface TocLayoutDecision {
	mode: TocLayoutMode;
	/** 外部模式可用轨道宽度（px） */
	outsideWidth: number;
	/** 文内浮卡自适应宽度（px），保证至少留出一半以上视口操作空间 */
	popoverWidth: number;
	/** 外部模式下估算的最大折行数 */
	maxEstimatedLines: number;
	/** 外部模式下折成 2 行及以上的条目占比（0..1） */
	wrappedRatio: number;
}

const DESKTOP_TWO_COLUMN_MIN_WIDTH = 1024;
const MIN_OUTSIDE_WIDTH_ENTER = 156;
const MIN_OUTSIDE_WIDTH_BASE = 148;
const MIN_OUTSIDE_WIDTH_STAY = 140;
const MAX_OUTSIDE_WIDTH = 280;

const MAX_WRAPPED_RATIO_ENTER = 0.34;
const MAX_WRAPPED_RATIO_STAY = 0.4;
const MIN_USABLE_TEXT_WIDTH = 56;
const LINE_WRAP_SAFETY_FACTOR = 1.06;

const MAX_POPOVER_VIEWPORT_RATIO = 0.48;
const MAX_DESKTOP_POPOVER_WIDTH = 272;
const MIN_MOBILE_POPOVER_WIDTH = 148;
const MIN_DESKTOP_POPOVER_WIDTH = 196;
const COMPACT_VIEWPORT_BREAKPOINT = 640;

/**
 * 计算单个目录条目除文字之外的横向占位（左侧轨道、圆点、缩进与内边距）。
 */
export function getHeadingChromeWidth(
	levelOffset: number,
	isCompactViewport = false,
): number {
	const clampedOffset = Math.max(0, Math.min(2, Math.floor(levelOffset)));
	if (isCompactViewport) {
		return 34 + clampedOffset * 10;
	}
	return 44 + clampedOffset * 12;
}

/**
 * 估算单条目录标题在给定容器宽度下的折行数。
 */
export function estimateHeadingLines(
	textWidth: number,
	containerWidth: number,
	levelOffset: number,
	isCompactViewport = false,
): number {
	const chromeWidth = getHeadingChromeWidth(levelOffset, isCompactViewport);
	const availableTextWidth = containerWidth - chromeWidth;
	if (availableTextWidth <= MIN_USABLE_TEXT_WIDTH) {
		return 99;
	}
	const safeWidth = Math.max(0, textWidth) * LINE_WRAP_SAFETY_FACTOR;
	if (safeWidth <= availableTextWidth) {
		return 1;
	}
	return Math.ceil(safeWidth / availableTextWidth);
}

/**
 * 计算文内毛玻璃浮卡的自适应宽度：
 * - 按实际标题所需宽度收缩，避免短标题撑出大片空白；
 * - 硬上限不超过视口宽度的 48%（桌面端同时不超过 272px），确保用户始终拥有一半以上可操作/可关闭空间。
 */
export function computeAdaptivePopoverWidth(
	viewportWidth: number,
	headings: TocHeadingMetric[],
): number {
	const safeViewport = Math.max(280, viewportWidth);
	const isCompact = safeViewport < COMPACT_VIEWPORT_BREAKPOINT;
	const maxByViewport = Math.floor(safeViewport * MAX_POPOVER_VIEWPORT_RATIO);
	const maxPopoverWidth = Math.min(MAX_DESKTOP_POPOVER_WIDTH, maxByViewport);
	const minPopoverWidth = Math.min(
		maxPopoverWidth,
		isCompact ? MIN_MOBILE_POPOVER_WIDTH : MIN_DESKTOP_POPOVER_WIDTH,
	);

	if (headings.length === 0) {
		return maxPopoverWidth;
	}

	let maxDesiredWidth = minPopoverWidth;
	for (const heading of headings) {
		const singleLineNeed =
			Math.ceil(Math.max(0, heading.textWidth) * LINE_WRAP_SAFETY_FACTOR) +
			getHeadingChromeWidth(heading.levelOffset, isCompact) +
			14;
		if (singleLineNeed > maxDesiredWidth) {
			maxDesiredWidth = singleLineNeed;
		}
	}

	return Math.max(minPopoverWidth, Math.min(maxPopoverWidth, maxDesiredWidth));
}

/**
 * 按当前屏幕外部可用空间与文章实际标题宽度动态决定 TOC 布局：
 * - 外部空间充裕且绝大多数标题可单行展示（最多允许约 1/3 条目折 2 行，不允许 3 行及以上）时，采用外部光学导轨（outside）；
 * - 否则退入文章内部贴右低透明刻度 + 展开浮卡（inside）。
 */
export function decideTocLayout(input: TocLayoutInput): TocLayoutDecision {
	const clampedOutsideWidth = Math.max(
		0,
		Math.min(MAX_OUTSIDE_WIDTH, Math.floor(input.availableOutsideWidth)),
	);
	const popoverWidth = computeAdaptivePopoverWidth(
		input.viewportWidth,
		input.headings,
	);

	if (input.viewportWidth < DESKTOP_TWO_COLUMN_MIN_WIDTH) {
		return {
			mode: "inside",
			outsideWidth: clampedOutsideWidth,
			popoverWidth,
			maxEstimatedLines: 0,
			wrappedRatio: 1,
		};
	}

	const minWidthThreshold =
		input.previousMode === "outside"
			? MIN_OUTSIDE_WIDTH_STAY
			: input.previousMode === "inside"
				? MIN_OUTSIDE_WIDTH_ENTER
				: MIN_OUTSIDE_WIDTH_BASE;

	if (clampedOutsideWidth < minWidthThreshold) {
		return {
			mode: "inside",
			outsideWidth: clampedOutsideWidth,
			popoverWidth,
			maxEstimatedLines: 99,
			wrappedRatio: 1,
		};
	}

	if (input.headings.length === 0) {
		return {
			mode: "outside",
			outsideWidth: clampedOutsideWidth,
			popoverWidth,
			maxEstimatedLines: 1,
			wrappedRatio: 0,
		};
	}

	let maxEstimatedLines = 1;
	let wrappedCount = 0;

	for (const heading of input.headings) {
		const lines = estimateHeadingLines(
			heading.textWidth,
			clampedOutsideWidth,
			heading.levelOffset,
			false,
		);
		if (lines > maxEstimatedLines) {
			maxEstimatedLines = lines;
		}
		if (lines >= 2) {
			wrappedCount++;
		}
	}

	const wrappedRatio = wrappedCount / input.headings.length;
	const maxWrappedRatio =
		input.previousMode === "outside"
			? MAX_WRAPPED_RATIO_STAY
			: MAX_WRAPPED_RATIO_ENTER;

	const canUseOutside =
		maxEstimatedLines <= 2 && wrappedRatio <= maxWrappedRatio;

	return {
		mode: canUseOutside ? "outside" : "inside",
		outsideWidth: clampedOutsideWidth,
		popoverWidth,
		maxEstimatedLines,
		wrappedRatio,
	};
}
