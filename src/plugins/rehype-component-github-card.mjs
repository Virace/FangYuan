import { h } from "hastscript";
import {
	getGithubCardFields,
	normalizeGithubRepo,
} from "../utils/github-repo.ts";

/** 生成无网络依赖的基础卡面；构建完成后可用本轮公开快照增强。 */
export function GithubCardComponent(properties, children) {
	const repo = normalizeGithubRepo(properties.repo);
	if (!repo || (Array.isArray(children) && children.length !== 0)) {
		return h(
			"div",
			{ class: "hidden" },
			"Invalid GitHub repository directive.",
		);
	}
	return renderGithubCard(repo);
}

// 显式插件对象会进入 Astro 的配置摘要，使旧卡片渲染缓存随管线迁移失效。
export const satteriGithubCard = {
	name: "fangyuan-github-card-notice",
	element: {
		filter: ["github"],
		visit(node, context) {
			context.replaceNode(
				node,
				GithubCardComponent(node.properties, node.children),
			);
		},
	},
};

export function renderGithubCard(repo, snapshot = null) {
	const fields = getGithubCardFields(repo, snapshot);
	const field = (className, value, label) =>
		h(
			"span",
			{
				class: className,
				hidden: value === null,
				...(label && value !== null
					? { "aria-label": `${label}: ${value}` }
					: {}),
			},
			value ?? "",
		);
	return h(
		"a",
		{
			class: "card-github no-styling",
			href: fields.href,
			target: "_blank",
			rel: "noopener noreferrer",
			"data-github-repo": repo,
			"data-github-state": snapshot ? "ready" : "static",
		},
		[
			h("div", { class: "gc-titlebar" }, [
				h("div", { class: "gc-titlebar-left" }, [
					h("div", { class: "gc-owner" }, [
						h("img", {
							class: "gc-avatar",
							...(fields.avatarUrl ? { src: fields.avatarUrl } : {}),
							hidden: !fields.avatarUrl,
							alt: "",
							loading: "lazy",
							decoding: "async",
							referrerPolicy: "no-referrer",
						}),
						h("span", { class: "gc-user" }, fields.owner),
					]),
					h("span", { class: "gc-divider", "aria-hidden": "true" }, "/"),
					h("span", { class: "gc-repo" }, fields.name),
				]),
				h("span", { class: "github-logo", "aria-hidden": "true" }),
			]),
			h("div", { class: "gc-content" }, [
				h(
					"div",
					{ class: "gc-description", hidden: !fields.description },
					fields.description ?? "",
				),
				h("div", { class: "gc-infobar", hidden: !snapshot }, [
					field("gc-stars", fields.stars, "Stars"),
					field("gc-forks", fields.forks, "Forks"),
					field("gc-license", fields.license, "License"),
					field("gc-language", fields.language, "Language"),
				]),
			]),
			h("span", { class: "gc-status", hidden: true }, [
				h("span", { class: "gc-status-icon", "aria-hidden": "true" }),
				h("span", { class: "gc-status-text" }),
			]),
		],
	);
}
