/// <reference types="mdast" />
import { h } from "hastscript";

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

/**
 * Creates a responsive grid for link cards.
 *
 * @param {Object} _properties - The properties of the component.
 * @param {import('mdast').RootContent[]} children - The children elements of the component.
 * @returns {import('mdast').Parent} The created link grid component.
 */
export function LinkGridComponent(_properties, children) {
	if (!Array.isArray(children) || children.length === 0) {
		return invalidDirective("Invalid link-grid directive");
	}

	return h("div", { class: "md-link-grid" }, children);
}
