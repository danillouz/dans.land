import {
  defaultTreeAdapter,
  parseFragment,
  serialize,
  type DefaultTreeAdapterMap,
} from "parse5"

import type { SearchPassage, SearchSection } from "./types"

type HtmlNode = DefaultTreeAdapterMap["node"]

const blockTags = new Set(["figure", "li", "p", "td", "th"])
const skippedTextTags = new Set(["pre", "script", "style"])

/**
 * Use IDs instead of text fragments so each result links to the exact heading
 * or passage the ranker chose, even when the same text appears more than once.
 * Separate heading anchors let CSS outline search hits without changing ordinary
 * heading links or running JavaScript on the destination page.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments
 */
export function prepareSearchContent(html: string) {
  const root = parseFragment(html)
  const passages: SearchPassage[] = []
  const sections: SearchSection[] = []
  const usedIds = new Set<string>()
  function reserveIds(node: HtmlNode) {
    const id = attribute(node, "id")
    if (id) {
      usedIds.add(id)
    }
    if ("childNodes" in node) {
      node.childNodes.forEach(reserveIds)
    }
  }
  reserveIds(root)
  let blockNumber = 0

  function generatedId(prefix: string, number: number) {
    let candidate = `${prefix}-${number}`
    while (usedIds.has(candidate)) {
      candidate = `${prefix}-${++number}`
    }
    usedIds.add(candidate)
    return candidate
  }

  function headingSearchId(
    heading: DefaultTreeAdapterMap["element"],
    slug: string,
  ) {
    const existing = heading.childNodes.find(
      (child) => attribute(child, "data-search-hit-anchor") !== undefined,
    )
    const existingId = existing && attribute(existing, "id")
    if (existingId) {
      return existingId
    }

    const preferred = `search-hit-${slug}`
    const id = usedIds.has(preferred) ? generatedId(preferred, 2) : preferred
    usedIds.add(id)
    const anchor = defaultTreeAdapter.createElement(
      "span",
      heading.namespaceURI,
      [
        { name: "id", value: id },
        { name: "data-search-hit-anchor", value: "" },
        { name: "aria-hidden", value: "true" },
      ],
    )
    const firstChild = heading.childNodes[0]
    if (firstChild) {
      defaultTreeAdapter.insertBefore(heading, anchor, firstChild)
    } else {
      defaultTreeAdapter.appendChild(heading, anchor)
    }
    return id
  }

  function visit(node: HtmlNode) {
    if (isHidden(node)) {
      return
    }

    if ("tagName" in node && /^h[2-6]$/.test(node.tagName)) {
      const slug = attribute(node, "id")
      if (slug && slug !== "footnote-label") {
        const title = compactText(node)
        sections.push({ id: headingSearchId(node, slug), title })
      }
    }

    if (
      isTag(
        node,
        (tag) =>
          skippedTextTags.has(tag) ||
          hasClass(node, "mermaid") ||
          hasClass(node, "expressive-code"),
      )
    ) {
      return
    }

    if (isTag(node, (tag) => blockTags.has(tag))) {
      const text = compactText(node, true)
      if (text) {
        blockNumber += 1
        const id =
          attribute(node, "id") || generatedId("search-hit", blockNumber)
        setAttribute(node, "id", id)
        setAttribute(node, "data-search-hit", "")
        passages.push({ text, id })
      }
    }

    if ("childNodes" in node) {
      for (const child of node.childNodes) {
        visit(child)
      }
    }
  }

  visit(root)
  preserveAstroImagePlaceholder(root)
  return { html: serialize(root), passages, sections }
}

function preserveAstroImagePlaceholder(node: HtmlNode) {
  if (isTag(node, "img") && "attrs" in node) {
    for (const attr of node.attrs) {
      if (attr.name === "__astro_image_") {
        attr.name = "__ASTRO_IMAGE_"
      }
    }
  }
  if ("childNodes" in node) {
    node.childNodes.forEach(preserveAstroImagePlaceholder)
  }
}

function isTag(node: HtmlNode, match: string | ((tag: string) => boolean)) {
  return (
    "tagName" in node &&
    (typeof match === "string" ? node.tagName === match : match(node.tagName))
  )
}

function attribute(node: HtmlNode, name: string) {
  if (!("attrs" in node)) {
    return undefined
  }
  return node.attrs.find((item) => item.name === name)?.value
}

function setAttribute(node: HtmlNode, name: string, value: string) {
  if (!("attrs" in node)) {
    return
  }
  const existing = node.attrs.find((item) => item.name === name)
  if (existing) {
    existing.value = value
  } else {
    node.attrs.push({ name, value })
  }
}

function hasClass(node: HtmlNode, name: string) {
  return attribute(node, "class")?.split(/\s+/).includes(name) ?? false
}

function isHidden(node: HtmlNode) {
  return (
    attribute(node, "hidden") !== undefined ||
    (attribute(node, "aria-hidden") === "true" && !isTag(node, "figcaption"))
  )
}

function compactText(node: HtmlNode, excludeNestedBlocks = false) {
  return textContent(node, excludeNestedBlocks).replace(/\s+/g, " ").trim()
}

function textContent(node: HtmlNode, excludeNestedBlocks = false): string {
  if (attribute(node, "data-footnote-backref") !== undefined) {
    return ""
  }
  if (isHidden(node)) {
    return ""
  }

  if ("tagName" in node) {
    if (node.tagName === "br") {
      return " "
    }
    if (
      skippedTextTags.has(node.tagName) ||
      hasClass(node, "mermaid") ||
      hasClass(node, "expressive-code")
    ) {
      return ""
    }
    if (node.tagName === "img") {
      return ""
    }
  }

  if (node.nodeName === "#text" && "value" in node) {
    return node.value
  }
  return childrenText(node, excludeNestedBlocks)
}

function childrenText(node: HtmlNode, excludeNestedBlocks: boolean): string {
  if (!("childNodes" in node)) {
    return ""
  }
  return node.childNodes
    .map((child) => {
      if (
        excludeNestedBlocks &&
        isTag(
          child,
          (tag) => blockTags.has(tag) || tag === "ul" || tag === "ol",
        )
      ) {
        return ""
      }
      return textContent(child, excludeNestedBlocks)
    })
    .join("")
}
