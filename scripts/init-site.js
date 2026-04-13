import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const SITE_CONFIG_TEMPLATE = `export const siteConfig = {
	title: "My Site",
	subtitle: "My subtitle",
};

export const navBarConfig = {
	links: [
		{ name: "Home", url: "/" },
		{ name: "Archive", url: "/archives/" },
		{ name: "About", url: "/about/" },
	],
};

export const profileConfig = {
	name: "Your Name",
	bio: "Write something here.",
	links: [],
};

export const expressiveCodeConfig = {
	theme: "github-dark",
};
`

const DEMO_POST_TEMPLATE = `---
title: Welcome to FangYuan
published: 2026-04-14
description: The first scaffolded post for the external site content layer.
tags: [FangYuan, Site, Demo]
category: Getting Started
draft: false
---

# Welcome to FangYuan

This post is created by \`node scripts/init-site.js\` to keep a fresh \`site/\` scaffold buildable.

- Replace this file with your own first post when you are ready.
- If your \`site/\` already contains real files, the scaffold script will not backfill demo posts.
`

function ensureDirectory(directoryPath, createdDirectories) {
  if (fs.existsSync(directoryPath)) {
    return
  }

  fs.mkdirSync(directoryPath, { recursive: true })
  createdDirectories.push(directoryPath)
}

function ensureFile(targetPath, content, createdFiles) {
  if (fs.existsSync(targetPath)) {
    return
  }

  fs.writeFileSync(targetPath, content, "utf8")
  createdFiles.push(targetPath)
}

function ensureCopiedFile(sourcePath, targetPath, createdFiles) {
  if (fs.existsSync(targetPath)) {
    return
  }

  fs.copyFileSync(sourcePath, targetPath)
  createdFiles.push(targetPath)
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

export function ensureExternalSiteScaffold(rootDir = process.cwd()) {
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

  ensureDirectory(sitePostsRoot, createdDirectories)
  ensureDirectory(siteSpecRoot, createdDirectories)
  ensureDirectory(siteAssetsRoot, createdDirectories)

  ensureCopiedFile(defaultAboutPath, siteAboutPath, createdFiles)
  ensureFile(siteConfigPath, SITE_CONFIG_TEMPLATE, createdFiles)

  if (shouldSeedDemoPost) {
    ensureFile(siteDemoPostPath, DEMO_POST_TEMPLATE, createdFiles)
  }

  return {
    createdDirectories,
    createdFiles,
  }
}

function isExecutedDirectly() {
  return process.argv[1] === fileURLToPath(import.meta.url)
}

if (isExecutedDirectly()) {
  const result = ensureExternalSiteScaffold()

  console.log(`Created directories: ${result.createdDirectories.length}`)
  console.log(`Created files: ${result.createdFiles.length}`)
}
