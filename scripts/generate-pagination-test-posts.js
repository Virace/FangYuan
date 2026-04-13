import fs from "node:fs"
import path from "node:path"

const rawCount = process.argv[2] ?? "30"
const count = Number.parseInt(rawCount, 10)

if (!Number.isInteger(count) || count <= 0) {
  console.error("Usage: node scripts/generate-pagination-test-posts.js [count]")
  process.exit(1)
}

const targetDir = path.join(
  process.cwd(),
  "src",
  "content",
  "posts",
  "test-pagination"
)

const titleAdjectives = [
  "Quiet",
  "Golden",
  "Electric",
  "Wandering",
  "Hidden",
  "Curious",
  "Slow",
  "Crisp",
  "Velvet",
  "Restless",
]

const titleNouns = [
  "Morning",
  "Notebook",
  "Harbor",
  "Lantern",
  "Archive",
  "Garden",
  "Signal",
  "Window",
  "Compass",
  "Bridge",
]

const categories = [
  "Testing",
  "Notes",
  "Journal",
  "Ideas",
  "Updates",
]

const tagPool = [
  "Pagination",
  "Testing",
  "Demo",
  "Content",
  "Markdown",
  "Drafting",
  "Layout",
  "Archive",
  "Sample",
  "Astro",
]

const introParts = [
  "This temporary article exists to fill the archive with realistic pagination data.",
  "A small batch of randomly generated content makes it easier to inspect page transitions and card density.",
  "The entry is intentionally lightweight, but still reads like a normal short post.",
  "This paragraph gives the listing page enough text to render summaries without looking empty.",
]

const detailParts = [
  "The tone, wording, and metadata are randomized so repeated cards do not feel mechanically duplicated.",
  "Each post keeps a clean frontmatter shape so it can flow through the existing content collection without extra handling.",
  "The body stays simple on purpose: enough text to look believable, not enough to distract from the pagination test.",
  "These articles are disposable fixtures for browsing, filtering, and checking the page count.",
]

const closingParts = [
  "After the pagination check is complete, the whole folder can be removed in one step.",
  "If more pages are needed later, rerunning the generator with a larger count is enough.",
  "This generated content is temporary and not intended for long-term publishing.",
  "The main goal is to make archive navigation easy to inspect under a fuller dataset.",
]

function pick(items) {
  return items[Math.floor(Math.random() * items.length)]
}

function sampleTags() {
  const pool = [...tagPool]
  const size = 2 + Math.floor(Math.random() * 3)
  const selected = []

  while (selected.length < size && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length)
    selected.push(pool.splice(index, 1)[0])
  }

  return selected
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function makeTitle(index) {
  return `${pick(titleAdjectives)} ${pick(titleNouns)} ${String(index).padStart(2, "0")}`
}

function makeDescription(index) {
  return `Temporary pagination test post ${String(index).padStart(2, "0")} with randomized content.`
}

function makeBody(title, index, tags, category) {
  const summary = [
    pick(introParts),
    pick(detailParts),
    pick(closingParts),
  ].join(" ")

  return `# ${title}

${summary}

## Quick Notes

- Batch item: ${String(index).padStart(2, "0")}
- Category: ${category}
- Tags: ${tags.join(", ")}

${pick(introParts)} ${pick(detailParts)}

> Pagination testing works better when the content list looks varied instead of perfectly uniform.

${pick(detailParts)} ${pick(closingParts)}
`
}

fs.mkdirSync(targetDir, { recursive: true })

const createdFiles = []

for (let index = 1; index <= count; index += 1) {
  const title = makeTitle(index)
  const description = makeDescription(index)
  const published = new Date()
  published.setDate(published.getDate() - (index - 1))

  const tags = sampleTags()
  const category = pick(categories)
  const fileName = `pagination-test-${String(index).padStart(2, "0")}.md`
  const fullPath = path.join(targetDir, fileName)

  const content = `---
title: ${title}
published: ${formatDate(published)}
description: ${description}
image: ""
tags: [${tags.join(", ")}]
category: ${category}
draft: false
lang: ""
---

${makeBody(title, index, tags, category)}`

  fs.writeFileSync(fullPath, content)
  createdFiles.push(path.relative(process.cwd(), fullPath))
}

console.log(`Generated ${createdFiles.length} test posts in ${path.relative(process.cwd(), targetDir)}`)
