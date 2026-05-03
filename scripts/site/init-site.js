import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promptInitSiteOptions } from "./init-site-prompts.js"

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const templateConfigPath = path.join(currentDir, "template.config.yaml")
const frontmatterConfigPath = path.join(currentDir, "..", "..", "frontmatter.json")
const vscodeExtensionsSource = `${JSON.stringify(
	{
		recommendations: ["eliostruyf.vscode-front-matter"],
	},
	null,
	2,
)}\n`
const vscodeSettingsSource = `${JSON.stringify(
	{
		"frontMatter.dashboard.openOnStart": false,
	},
	null,
	2,
)}\n`
const assetReadmeSource = `# <siteRoot>/assets

这里存放外部站点自有静态图片。外部站点根目录不一定是 FangYuan 仓库内的 \`site/\`，实际位置由初始化脚本参数或 \`FANGYUAN_SITE_ROOT\` 决定。

安全写法：

- 替换位置：\`assets/images/banner.svg\`：站点 banner
- 替换位置：\`assets/images/avatar.svg\`：作者头像
- 替换位置：\`assets/favicon/icon.svg\`：站点 favicon
- 替换位置：\`assets/reward/wechat.svg\`：微信打赏二维码
- 替换位置：\`assets/reward/alipay.svg\`：支付宝打赏二维码
- 替换位置：\`assets/icons/police-emblem.svg\`：公安备案图标
- \`assets/posts/<slug>/cover.webp\`：文章封面
- \`content/posts/<slug>/screenshot.webp\`：文章正文相对图片

在 \`site.config.yaml\` 或文章 frontmatter 中引用 \`assets/...\` 时，FangYuan 会把它当作 external site root 下的本地图片输入，并交给 Astro 图片管线处理。未被当前配置或内容引用的占位符不会进入最终 \`dist\`。

不要在这里存放迁移审计、预览或中间转换数据。

CDN 图片可以继续使用 \`https://...\`，但它不会被本地构建打包或校验。
`

function buildSvgPlaceholder({ width, height, title, subtitle, fill, accent }) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <rect width="${width}" height="${height}" rx="${Math.round(Math.min(width, height) * 0.08)}" fill="${fill}"/>
  <rect x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.12)}" width="${Math.round(width * 0.88)}" height="${Math.round(height * 0.76)}" rx="${Math.round(Math.min(width, height) * 0.05)}" fill="none" stroke="${accent}" stroke-width="${Math.max(2, Math.round(Math.min(width, height) * 0.015))}" stroke-dasharray="12 10"/>
  <text x="50%" y="48%" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(Math.min(width, height) * 0.14)}" font-weight="700" fill="${accent}">${title}</text>
  <text x="50%" y="62%" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(Math.min(width, height) * 0.07)}" fill="${accent}">${subtitle}</text>
</svg>
`
}

const assetPlaceholders = [
	{
		relativePath: path.join("images", "banner.svg"),
		content: buildSvgPlaceholder({
			width: 1400,
			height: 900,
			title: "Banner",
			subtitle: "替换 assets/images/banner.svg",
			fill: "#f8fafc",
			accent: "#2563eb",
		}),
	},
	{
		relativePath: path.join("images", "avatar.svg"),
		content: buildSvgPlaceholder({
			width: 512,
			height: 512,
			title: "Avatar",
			subtitle: "替换 assets/images/avatar.svg",
			fill: "#fefce8",
			accent: "#ca8a04",
		}),
	},
	{
		relativePath: path.join("favicon", "icon.svg"),
		content: buildSvgPlaceholder({
			width: 256,
			height: 256,
			title: "FY",
			subtitle: "替换 favicon",
			fill: "#eef2ff",
			accent: "#4f46e5",
		}),
	},
	{
		relativePath: path.join("reward", "wechat.svg"),
		content: buildSvgPlaceholder({
			width: 512,
			height: 512,
			title: "WeChat",
			subtitle: "替换微信二维码",
			fill: "#ecfdf5",
			accent: "#16a34a",
		}),
	},
	{
		relativePath: path.join("reward", "alipay.svg"),
		content: buildSvgPlaceholder({
			width: 512,
			height: 512,
			title: "Alipay",
			subtitle: "替换支付宝二维码",
			fill: "#eff6ff",
			accent: "#0284c7",
		}),
	},
	{
		relativePath: path.join("icons", "police-emblem.svg"),
		content: buildSvgPlaceholder({
			width: 128,
			height: 128,
			title: "备案",
			subtitle: "替换图标",
			fill: "#f1f5f9",
			accent: "#475569",
		}),
	},
]

function ensureDirectory(directoryPath, createdDirectories, operations, execution) {
	if (fs.existsSync(directoryPath)) {
		operations.push({
			kind: "directory",
			status: "existing",
			path: directoryPath,
		})
		return
	}

	if (execution.dryRun) {
		operations.push({
			kind: "directory",
			status: "planned",
			path: directoryPath,
		})
		return
	}

	fs.mkdirSync(directoryPath, { recursive: true })
	createdDirectories.push(directoryPath)
	operations.push({
		kind: "directory",
		status: "created",
		path: directoryPath,
	})
}

function ensureFile(
	targetPath,
	content,
	createdFiles,
	operations,
	execution,
	metadata = {},
) {
	const mode = metadata.mode ?? "write"
	const sourcePath = metadata.sourcePath

	if (fs.existsSync(targetPath)) {
		operations.push({
			kind: "file",
			mode,
			status: "existing",
			path: targetPath,
			...(sourcePath ? { sourcePath } : {}),
		})
		return
	}

	if (execution.dryRun) {
		operations.push({
			kind: "file",
			mode,
			status: "planned",
			path: targetPath,
			...(sourcePath ? { sourcePath } : {}),
		})
		return
	}

	fs.mkdirSync(path.dirname(targetPath), { recursive: true })
	fs.writeFileSync(targetPath, content, "utf8")
	createdFiles.push(targetPath)
	operations.push({
		kind: "file",
		mode,
		status: "created",
		path: targetPath,
		...(sourcePath ? { sourcePath } : {}),
	})
}

function ensureCopiedFile(sourcePath, targetPath, createdFiles, operations, execution) {
	if (fs.existsSync(targetPath)) {
		operations.push({
			kind: "file",
			mode: "copy",
			status: "existing",
			path: targetPath,
			sourcePath,
		})
		return
	}

	if (execution.dryRun) {
		operations.push({
			kind: "file",
			mode: "copy",
			status: "planned",
			path: targetPath,
			sourcePath,
		})
		return
	}

	fs.copyFileSync(sourcePath, targetPath)
	createdFiles.push(targetPath)
	operations.push({
		kind: "file",
		mode: "copy",
		status: "created",
		path: targetPath,
		sourcePath,
	})
}

function copyDirectoryContents(
	sourceDir,
	targetDir,
	createdDirectories,
	createdFiles,
	operations,
	execution,
) {
	if (!fs.existsSync(sourceDir)) {
		return
	}

	ensureDirectory(targetDir, createdDirectories, operations, execution)

	for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
		const sourcePath = path.join(sourceDir, entry.name)
		const targetPath = path.join(targetDir, entry.name)

		if (entry.isDirectory()) {
			copyDirectoryContents(
				sourcePath,
				targetPath,
				createdDirectories,
				createdFiles,
				operations,
				execution,
			)
			continue
		}

		if (entry.isFile()) {
			ensureCopiedFile(
				sourcePath,
				targetPath,
				createdFiles,
				operations,
				execution,
			)
		}
	}
}

function directoryHasFiles(directoryPath) {
	if (!fs.existsSync(directoryPath)) {
		return false
	}

	const entries = fs.readdirSync(directoryPath, { withFileTypes: true })

	for (const entry of entries) {
		const entryPath = path.join(directoryPath, entry.name)

		if (entry.isFile()) {
			return true
		}

		if (entry.isDirectory() && directoryHasFiles(entryPath)) {
			return true
		}
	}

	return false
}

function resolveInitSiteOptions(input = {}) {
	return {
		siteTitle: input.siteTitle ?? "My Site",
		siteSubtitle: input.siteSubtitle ?? "My subtitle",
		profileName: input.profileName ?? "Your Name",
		profileBio: input.profileBio ?? "Write something here.",
		qingyanSiteKey: input.qingyanSiteKey ?? "fangyuan",
		qingyanDevProxyTarget: input.qingyanDevProxyTarget ?? null,
		includeFrontmatterConfig: input.includeFrontmatterConfig ?? true,
		includeVSCodeConfig: input.includeVSCodeConfig ?? true,
	}
}

function resolveExecutionOptions(input = {}) {
	return {
		dryRun: input.dryRun ?? false,
		siteRoot: input.siteRoot ?? null,
		seedFromSrcContent: input.seedFromSrcContent ?? false,
	}
}

function getRelativePath(rootDir, targetPath) {
	return path.relative(rootDir, targetPath) || "."
}

function formatOperationForConsole(rootDir, operation) {
	const prefixMap = {
		created: "[done]",
		planned: "[plan]",
		existing: "[skip]",
	}
	const prefix = prefixMap[operation.status] ?? "[info]"

	if (operation.kind === "directory") {
		return `${prefix} mkdir ${getRelativePath(rootDir, operation.path)}`
	}

	if (operation.mode === "copy" && operation.sourcePath) {
		return `${prefix} copy ${getRelativePath(rootDir, operation.sourcePath)} -> ${getRelativePath(rootDir, operation.path)}`
	}

	return `${prefix} write ${getRelativePath(rootDir, operation.path)}`
}

function getCliValue(argv, name) {
	const index = argv.indexOf(name)
	if (index < 0) {
		return undefined
	}
	return argv[index + 1]
}

export function parseCliOptions(argv = process.argv.slice(2)) {
	const interactive = argv.length === 0

	return {
		interactive,
		initOptions: {
			...(getCliValue(argv, "--site-title")
				? { siteTitle: getCliValue(argv, "--site-title") }
				: {}),
			...(getCliValue(argv, "--site-subtitle")
				? { siteSubtitle: getCliValue(argv, "--site-subtitle") }
				: {}),
			...(getCliValue(argv, "--profile-name")
				? { profileName: getCliValue(argv, "--profile-name") }
				: {}),
			...(getCliValue(argv, "--profile-bio")
				? { profileBio: getCliValue(argv, "--profile-bio") }
				: {}),
			...(getCliValue(argv, "--qingyan-site-key")
				? { qingyanSiteKey: getCliValue(argv, "--qingyan-site-key") }
				: {}),
			...(getCliValue(argv, "--qingyan-dev-proxy-target")
				? {
						qingyanDevProxyTarget: getCliValue(
							argv,
							"--qingyan-dev-proxy-target",
						),
					}
				: {}),
			includeFrontmatterConfig: !argv.includes("--no-frontmatter"),
			includeVSCodeConfig: !argv.includes("--no-vscode"),
		},
		runtimeOptions: {
			dryRun: argv.includes("--dry-run"),
			seedFromSrcContent: argv.includes("--seed-from-src-content"),
			siteRoot: getCliValue(argv, "--site-root") ?? null,
		},
	}
}

function escapeYamlScalar(value) {
	const normalized = String(value ?? "").replace(/\r\n/g, "\n")
	return JSON.stringify(normalized)
}

function materializeSiteConfigTemplate(templateSource, options) {
	const replacements = new Map([
		["{{SITE_TITLE}}", escapeYamlScalar(options.siteTitle ?? "My Site")],
		["{{SITE_SUBTITLE}}", escapeYamlScalar(options.siteSubtitle ?? "My subtitle")],
		["{{PROFILE_NAME}}", escapeYamlScalar(options.profileName ?? "Your Name")],
		[
			"{{PROFILE_BIO}}",
			escapeYamlScalar(options.profileBio ?? "Write something here."),
		],
		[
			"{{QINGYAN_SITE_KEY}}",
			escapeYamlScalar(options.qingyanSiteKey ?? "fangyuan"),
		],
		[
			"{{QINGYAN_DEV_PROXY_TARGET}}",
			options.qingyanDevProxyTarget
				? escapeYamlScalar(options.qingyanDevProxyTarget)
				: "null",
		],
	])

	let rendered = templateSource
	for (const [needle, replacement] of replacements) {
		rendered = rendered.replaceAll(needle, replacement)
	}

	return rendered
}

export async function renderSiteConfigTemplate(options) {
	const templateSource = await fs.promises.readFile(templateConfigPath, "utf8")
	return materializeSiteConfigTemplate(templateSource, options)
}

export async function renderFrontmatterConfigTemplate() {
	const source = await fs.promises.readFile(frontmatterConfigPath, "utf8")
	const config = JSON.parse(source)

	config["frontMatter.content.publicFolder"] = "assets"
	config["frontMatter.content.pageFolders"] = [
		{
			title: "posts",
			path: "[[workspace]]/content/posts",
			contentTypes: ["default"],
		},
		{
			title: "spec",
			path: "[[workspace]]/content/spec",
			contentTypes: ["spec"],
		},
	]

	return `${JSON.stringify(config, null, 2)}\n`
}

export function buildWelcomePostTemplate(options) {
	return `---
title: Welcome to ${options.siteTitle}
published: 2026-04-14
description: The first scaffolded post for the external site content layer.
tags: [FangYuan, Site, Demo]
category: Getting Started
draft: false
---

# Welcome to ${options.siteTitle}

This post is created by \`node scripts/site/init-site.js\` to keep a fresh external site root buildable.

- Replace this file with your own first post when you are ready.
- If your external site root already contains real files, the scaffold script will not backfill demo posts.
`
}

export async function ensureExternalSiteScaffold(
	rootDir = process.cwd(),
	input = {},
	runtime = {},
) {
	const options = resolveInitSiteOptions(input)
	const execution = resolveExecutionOptions(runtime)
	const siteRoot = execution.siteRoot
		? path.resolve(rootDir, execution.siteRoot)
		: path.join(rootDir, "site")
	const siteContentRoot = path.join(siteRoot, "content")
	const sitePostsRoot = path.join(siteContentRoot, "posts")
	const siteSpecRoot = path.join(siteContentRoot, "spec")
	const siteAssetsRoot = path.join(siteRoot, "assets")
	const siteAssetsReadmePath = path.join(siteAssetsRoot, "README.md")
	const srcContentRoot = path.join(rootDir, "src", "content")
	const defaultAboutPath = path.join(srcContentRoot, "spec", "about.md")
	const siteAboutPath = path.join(siteSpecRoot, "about.md")
	const siteConfigPath = path.join(siteRoot, "site.config.yaml")
	const siteFrontmatterConfigPath = path.join(siteRoot, "frontmatter.json")
	const siteVSCodeExtensionsPath = path.join(siteRoot, ".vscode", "extensions.json")
	const siteVSCodeSettingsPath = path.join(siteRoot, ".vscode", "settings.json")
	const siteDemoPostPath = path.join(sitePostsRoot, "welcome.md")
	const shouldSeedDemoPost =
		!execution.seedFromSrcContent && !directoryHasFiles(siteRoot)
	const renderedSiteConfig = await renderSiteConfigTemplate(options)
	const renderedFrontmatterConfig = await renderFrontmatterConfigTemplate()

	const createdDirectories = []
	const createdFiles = []
	const operations = []

	ensureDirectory(sitePostsRoot, createdDirectories, operations, execution)
	ensureDirectory(siteSpecRoot, createdDirectories, operations, execution)
	ensureDirectory(siteAssetsRoot, createdDirectories, operations, execution)
	ensureFile(
		siteAssetsReadmePath,
		assetReadmeSource,
		createdFiles,
		operations,
		execution,
	)
	for (const placeholder of assetPlaceholders) {
		ensureFile(
			path.join(siteAssetsRoot, placeholder.relativePath),
			placeholder.content,
			createdFiles,
			operations,
			execution,
		)
	}

	if (execution.seedFromSrcContent) {
		copyDirectoryContents(
			srcContentRoot,
			siteContentRoot,
			createdDirectories,
			createdFiles,
			operations,
			execution,
		)
	}

	ensureCopiedFile(
		defaultAboutPath,
		siteAboutPath,
		createdFiles,
		operations,
		execution,
	)
	ensureFile(
		siteConfigPath,
		renderedSiteConfig,
		createdFiles,
		operations,
		execution,
		{
			mode: "copy",
			sourcePath: templateConfigPath,
		},
	)
	if (options.includeFrontmatterConfig) {
		ensureFile(
			siteFrontmatterConfigPath,
			renderedFrontmatterConfig,
			createdFiles,
			operations,
			execution,
			{
				mode: "copy",
				sourcePath: frontmatterConfigPath,
			},
		)
	}

	if (options.includeVSCodeConfig) {
		ensureFile(
			siteVSCodeExtensionsPath,
			vscodeExtensionsSource,
			createdFiles,
			operations,
			execution,
		)
		ensureFile(
			siteVSCodeSettingsPath,
			vscodeSettingsSource,
			createdFiles,
			operations,
			execution,
		)
	}

	if (shouldSeedDemoPost) {
		ensureFile(
			siteDemoPostPath,
			buildWelcomePostTemplate(options),
			createdFiles,
			operations,
			execution,
		)
	}

	return {
		createdDirectories,
		createdFiles,
		dryRun: execution.dryRun,
		operations,
	}
}

function isExecutedDirectly() {
	return process.argv[1] === fileURLToPath(import.meta.url)
}

if (isExecutedDirectly()) {
	const cliOptions = parseCliOptions()
	const options = cliOptions.interactive
		? await promptInitSiteOptions()
		: cliOptions.initOptions
	const result = await ensureExternalSiteScaffold(
		process.cwd(),
		options,
		cliOptions.runtimeOptions,
	)

	console.log(cliOptions.dryRun ? "Planned actions:" : "Applied actions:")
	for (const operation of result.operations) {
		console.log(`- ${formatOperationForConsole(process.cwd(), operation)}`)
	}
	console.log(`Created directories: ${result.createdDirectories.length}`)
	console.log(`Created files: ${result.createdFiles.length}`)
}
