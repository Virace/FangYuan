import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants.ts";
import { expressiveCodeConfig } from "@/config";
import dot from "@/theme-assets/icons/cursor-dot.svg?raw";
import darkDot from "@/theme-assets/icons/cursor-dot-dark.svg?raw";
import link from "@/theme-assets/icons/cursor-link.svg?raw";
import grab from "@/theme-assets/icons/optics-grab.svg?raw";
import grabbing from "@/theme-assets/icons/optics-grabbing.svg?raw";
import type { LIGHT_DARK_MODE } from "@/types/config";

const cursorTemplates = { dot, "dot-dark": darkDot, link, grab, grabbing };
let cursorHue: number | undefined;

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function getHue(): number {
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function setHue(hue: number): void {
	localStorage.setItem("hue", String(hue));
	const style = document.documentElement.style;
	style.setProperty("--hue", String(hue));
	if (cursorHue === hue) return;
	const accent = `oklch(0.78 0.13 ${hue})`;
	for (const [name, svg] of Object.entries(cursorTemplates)) {
		const image = encodeURIComponent(svg.replaceAll("currentColor", accent));
		style.setProperty(
			`--cursor-${name}-image`,
			`url("data:image/svg+xml,${image}")`,
		);
	}
	cursorHue = hue;
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE): void {
	switch (theme) {
		case LIGHT_MODE:
			document.documentElement.classList.remove("dark");
			break;
		case DARK_MODE:
			document.documentElement.classList.add("dark");
			break;
		case AUTO_MODE:
			if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
			break;
	}

	// Set the theme for Expressive Code
	document.documentElement.setAttribute(
		"data-theme",
		expressiveCodeConfig.theme,
	);
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	localStorage.setItem("theme", theme);
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
}
