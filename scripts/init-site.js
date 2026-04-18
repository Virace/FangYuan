import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { promptInitSiteOptions } from "./init-site-prompts.js"
import {
	buildSiteConfigTemplate,
	buildWelcomePostTemplate,
} from "./init-site-template.js"

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

function ensureFile(targetPath, content, createdFiles, operations, execution) {
  if (fs.existsSync(targetPath)) {
    operations.push({
      kind: "file",
      mode: "write",
      status: "existing",
      path: targetPath,
    })
    return
  }

  if (execution.dryRun) {
    operations.push({
      kind: "file",
      mode: "write",
      status: "planned",
      path: targetPath,
    })
    return
  }

  fs.writeFileSync(targetPath, content, "utf8")
  createdFiles.push(targetPath)
  operations.push({
    kind: "file",
    mode: "write",
    status: "created",
    path: targetPath,
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
		qingyanApiBase: input.qingyanApiBase ?? "/api",
		qingyanDevProxyTarget: input.qingyanDevProxyTarget ?? null,
		enableComments: input.enableComments ?? true,
		enablePageMetrics: input.enablePageMetrics ?? true,
		enablePageFeedback: input.enablePageFeedback ?? true,
		includeRewardPlaceholders: input.includeRewardPlaceholders ?? true,
	}
}

function resolveExecutionOptions(input = {}) {
  return {
    dryRun: input.dryRun ?? false,
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
  return {
    dryRun: argv.includes("--dry-run"),
  }
}

export function ensureExternalSiteScaffold(rootDir = process.cwd(), input = {}, runtime = {}) {
  const options = resolveInitSiteOptions(input)
  const execution = resolveExecutionOptions(runtime)
  const siteRoot = path.join(rootDir, "site")
  const siteContentRoot = path.join(siteRoot, "content")
  const sitePostsRoot = path.join(siteContentRoot, "posts")
  const siteSpecRoot = path.join(siteContentRoot, "spec")
  const siteAssetsRoot = path.join(siteRoot, "assets")
  const defaultAboutPath = path.join(rootDir, "src", "content", "spec", "about.md")
  const siteAboutPath = path.join(siteSpecRoot, "about.md")
  const siteConfigPath = path.join(siteRoot, "config.ts")
  const siteDemoPostPath = path.join(sitePostsRoot, "welcome.md")
  const shouldSeedDemoPost = !directoryHasFiles(siteRoot)

  const createdDirectories = []
  const createdFiles = []
  const operations = []

  ensureDirectory(sitePostsRoot, createdDirectories, operations, execution)
  ensureDirectory(siteSpecRoot, createdDirectories, operations, execution)
  ensureDirectory(siteAssetsRoot, createdDirectories, operations, execution)

  ensureCopiedFile(
    defaultAboutPath,
    siteAboutPath,
    createdFiles,
    operations,
    execution,
  )
  ensureFile(
    siteConfigPath,
    buildSiteConfigTemplate(options),
    createdFiles,
    operations,
    execution,
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
  const result = ensureExternalSiteScaffold(process.cwd(), options, cliOptions)

  console.log(cliOptions.dryRun ? "Planned actions:" : "Applied actions:")
  for (const operation of result.operations) {
    console.log(`- ${formatOperationForConsole(process.cwd(), operation)}`)
  }
  console.log(`Created directories: ${result.createdDirectories.length}`)
  console.log(`Created files: ${result.createdFiles.length}`)
}
