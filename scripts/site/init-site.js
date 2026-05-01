import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promptInitSiteOptions } from "./init-site-prompts.js"

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const templateConfigPath = path.join(currentDir, "template.config.yaml")
const assetReadmeSource = `# site/assets

这里存放外部站点自有静态图片。

安全写法：

- \`assets/images/banner.webp\`：站点 banner
- \`assets/images/avatar.png\`：作者头像
- \`assets/posts/<slug>/cover.webp\`：文章封面
- \`content/posts/<slug>/screenshot.webp\`：文章正文相对图片

在 \`site.config.yaml\` 或文章 frontmatter 中引用 \`assets/...\` 时，FangYuan 会把它当作 external site root 下的本地图片输入，并交给 Astro 图片管线处理。

不要在这里存放迁移审计、预览或中间转换数据。

CDN 图片可以继续使用 \`https://...\`，但它不会被本地构建打包或校验。
`

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

function parseCliOptions(argv = process.argv.slice(2)) {
	const siteRootIndex = argv.indexOf("--site-root")

	return {
		dryRun: argv.includes("--dry-run"),
		seedFromSrcContent: argv.includes("--seed-from-src-content"),
		siteRoot:
			siteRootIndex >= 0 && argv[siteRootIndex + 1]
				? argv[siteRootIndex + 1]
				: null,
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

This post is created by \`node scripts/site/init-site.js\` to keep a fresh \`site/\` scaffold buildable.

- Replace this file with your own first post when you are ready.
- If your \`site/\` already contains real files, the scaffold script will not backfill demo posts.
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
	const siteDemoPostPath = path.join(sitePostsRoot, "welcome.md")
	const shouldSeedDemoPost =
		!execution.seedFromSrcContent && !directoryHasFiles(siteRoot)
	const renderedSiteConfig = await renderSiteConfigTemplate(options)

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
	const options = await promptInitSiteOptions()
	const result = await ensureExternalSiteScaffold(
		process.cwd(),
		options,
		cliOptions,
	)

	console.log(cliOptions.dryRun ? "Planned actions:" : "Applied actions:")
	for (const operation of result.operations) {
		console.log(`- ${formatOperationForConsole(process.cwd(), operation)}`)
	}
	console.log(`Created directories: ${result.createdDirectories.length}`)
	console.log(`Created files: ${result.createdFiles.length}`)
}
