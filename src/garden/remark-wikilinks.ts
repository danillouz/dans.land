/**
 * Records syntactic wikilinks for the collection-wide resolver while leaving
 * lookalikes in code, comments, and ordinary Markdown links untouched.
 *
 * Garden posts support Obsidian-style wikilinks such as `[[Welcome]]`,
 * `[[Welcome|the garden gate]]`, and `[[Linking posts#Details]]`.
 */

import path from "node:path"

import type { Root } from "mdast"
import type { VFile } from "vfile"

import { parseWikiLink } from "./links.ts"
import type { WikiLinkReference } from "./links.ts"

interface MarkdownNodeData extends Record<string, unknown> {
  alias?: string
}

interface MarkdownNode {
  children?: MarkdownNode[]
  data?: MarkdownNodeData
  type: string
  value?: string
}

interface GardenFileData {
  frontmatter: Record<string, unknown>
}

function makeWikiLinksLiteral(node: MarkdownNode) {
  if (node.type === "wikiLink") {
    const alias = node.data?.alias ? `|${node.data.alias}` : ""
    node.type = "text"
    node.value = `[[${node.value}${alias}]]`
    delete node.data
    return
  }

  if (!Array.isArray(node.children)) {
    return
  }

  for (const child of node.children) {
    makeWikiLinksLiteral(child)
  }
}

function collectWikiLinks(node: MarkdownNode, references: WikiLinkReference[]) {
  if (node.type === "link" || node.type === "linkReference") {
    makeWikiLinksLiteral(node)
    return
  }

  if (node.type === "wikiLink") {
    const parsed = parseWikiLink(node.value, node.data?.alias ?? null)
    const referenceIndex = references.push(parsed) - 1
    node.data = {
      ...node.data,
      hChildren: [
        {
          type: "text",
          value: parsed.label ?? (parsed.target || parsed.fragment),
        },
      ],
      hName: "a",
      hProperties: {
        className: ["wikilink"],
        href: `/__garden_wikilink__/${referenceIndex}`,
      },
    }
    return
  }

  if (!Array.isArray(node.children)) {
    return
  }

  for (const child of node.children) {
    collectWikiLinks(child, references)
  }
}

export function remarkGardenLinks({
  gardenRoot = "data/garden",
}: { gardenRoot?: string } = {}) {
  const root = path.resolve(gardenRoot)
  return (tree: Root, file: VFile) => {
    if (
      !file.path ||
      !path.resolve(file.path).startsWith(`${root}${path.sep}`)
    ) {
      makeWikiLinksLiteral(tree as MarkdownNode)
      return
    }

    const references: WikiLinkReference[] = []
    collectWikiLinks(tree as MarkdownNode, references)

    const astro = file.data.astro as GardenFileData | undefined
    if (!astro?.frontmatter) {
      throw new Error("Astro Markdown frontmatter is unavailable.")
    }

    astro.frontmatter.gardenLinks = references
  }
}
