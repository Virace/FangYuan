import assert from "node:assert/strict";
import test from "node:test";

import {
	computeAdaptivePopoverWidth,
	decideTocLayout,
	estimateHeadingLines,
} from "../src/utils/browser/toc-layout.ts";

test("uses outside layout when desktop space fits short headings mostly on one line", () => {
	const decision = decideTocLayout({
		viewportWidth: 1600,
		availableOutsideWidth: 184,
		headings: [
			{ levelOffset: 0, textWidth: 64 },
			{ levelOffset: 1, textWidth: 78 },
			{ levelOffset: 0, textWidth: 112 },
			{ levelOffset: 1, textWidth: 54 },
		],
	});

	assert.equal(decision.mode, "outside");
	assert.equal(decision.outsideWidth, 184);
	assert.ok(decision.maxEstimatedLines <= 2);
});

test("falls back to inside layout when too many headings wrap to two lines", () => {
	const decision = decideTocLayout({
		viewportWidth: 1600,
		availableOutsideWidth: 184,
		headings: [
			{ levelOffset: 0, textWidth: 190 },
			{ levelOffset: 1, textWidth: 185 },
			{ levelOffset: 1, textWidth: 175 },
			{ levelOffset: 0, textWidth: 80 },
		],
	});

	assert.equal(decision.mode, "inside");
	assert.ok(decision.wrappedRatio > 0.34);
});

test("falls back to inside layout when any heading would wrap to three or more lines", () => {
	const decision = decideTocLayout({
		viewportWidth: 1640,
		availableOutsideWidth: 204,
		headings: [
			{ levelOffset: 0, textWidth: 60 },
			{ levelOffset: 0, textWidth: 65 },
			{ levelOffset: 0, textWidth: 62 },
			{ levelOffset: 2, textWidth: 320 },
		],
	});

	assert.equal(decision.mode, "inside");
	assert.ok(decision.maxEstimatedLines >= 3);
});

test("applies width hysteresis around the outside threshold to avoid resize jitter", () => {
	const shortHeadings = [
		{ levelOffset: 0, textWidth: 52 },
		{ levelOffset: 1, textWidth: 58 },
	];

	const stayingOutside = decideTocLayout({
		viewportWidth: 1520,
		availableOutsideWidth: 144,
		headings: shortHeadings,
		previousMode: "outside",
	});
	const stayingInside = decideTocLayout({
		viewportWidth: 1520,
		availableOutsideWidth: 144,
		headings: shortHeadings,
		previousMode: "inside",
	});

	assert.equal(stayingOutside.mode, "outside");
	assert.equal(stayingInside.mode, "inside");
});

test("always uses inside layout below desktop two-column breakpoint", () => {
	const decision = decideTocLayout({
		viewportWidth: 960,
		availableOutsideWidth: 220,
		headings: [{ levelOffset: 0, textWidth: 48 }],
	});

	assert.equal(decision.mode, "inside");
});

test("caps mobile popover width to at most 48% of viewport so more than half remains operable", () => {
	const mobileLong = computeAdaptivePopoverWidth(390, [
		{ levelOffset: 0, textWidth: 260 },
		{ levelOffset: 1, textWidth: 310 },
	]);
	assert.ok(mobileLong <= Math.floor(390 * 0.48));
	assert.ok(mobileLong >= 148);

	const tinyMobileLong = computeAdaptivePopoverWidth(320, [
		{ levelOffset: 0, textWidth: 280 },
	]);
	assert.ok(tinyMobileLong <= Math.floor(320 * 0.48));

	const mobileShort = computeAdaptivePopoverWidth(390, [
		{ levelOffset: 0, textWidth: 52 },
	]);
	assert.ok(mobileShort < mobileLong);

	const desktopLong = computeAdaptivePopoverWidth(1440, [
		{ levelOffset: 0, textWidth: 320 },
	]);
	assert.equal(desktopLong, 272);
});

test("estimateHeadingLines accounts for nesting indent", () => {
	const topLines = estimateHeadingLines(120, 180, 0);
	const nestedLines = estimateHeadingLines(120, 180, 2);
	assert.equal(topLines, 1);
	assert.equal(nestedLines, 2);
});
