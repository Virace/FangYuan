/// <reference types="mdast" />
import { h } from "hastscript";

const bvidPattern = /^BV[0-9A-Za-z]{10}$/;

function invalidDirective(message) {
	return h(
		"div",
		{
			class: "hidden md-directive-invalid",
			"data-md-directive-error": message,
		},
		message,
	);
}

function normalizePage(value) {
	const page = Number.parseInt(String(value ?? "1"), 10);
	return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

/**
 * Creates a Bilibili video embed component.
 *
 * @param {Object} properties - The properties of the component.
 * @param {string} properties.bvid - The Bilibili video BV id.
 * @param {string} [properties.p] - Optional video part number.
 * @param {string} [properties.title] - Optional iframe title.
 * @param {import('mdast').RootContent[]} children - The children elements of the component.
 * @returns {import('mdast').Parent} The created Bilibili embed component.
 */
export function BilibiliVideoComponent(properties, children) {
	if (Array.isArray(children) && children.length !== 0) {
		return invalidDirective("Invalid bilibili directive");
	}

	const bvid = String(properties?.bvid ?? "").trim();
	if (!bvidPattern.test(bvid)) {
		return invalidDirective("Invalid bilibili bvid");
	}

	const title =
		String(properties?.title ?? "Bilibili video").trim() || "Bilibili video";
	const params = new URLSearchParams({
		bvid,
		p: String(normalizePage(properties?.p)),
	});

	return h("figure", { class: "md-bilibili" }, [
		h("iframe", {
			src: `https://player.bilibili.com/player.html?${params.toString()}`,
			title,
			scrolling: "no",
			border: "0",
			frameborder: "no",
			framespacing: "0",
			allow: "fullscreen; picture-in-picture",
			allowfullscreen: true,
			loading: "lazy",
			referrerpolicy: "no-referrer-when-downgrade",
		}),
		h("figcaption", { class: "md-bilibili-title" }, title),
	]);
}
