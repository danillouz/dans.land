import type { APIRoute } from "astro"
import { parseFragment, type DefaultTreeAdapterMap } from "parse5"

import { getPublishedGardenEntries } from "../garden/collection"
import type { SearchEntry } from "../search/types"

type HtmlNode = DefaultTreeAdapterMap["node"]

const sitePages = [
  {
    title: "Home",
    kind: "page",
    path: "/",
  },
  {
    title: "Garden",
    kind: "page",
    path: "/garden",
  },
  {
    title: "All garden posts",
    kind: "page",
    path: "/garden/all",
  },
  {
    title: "About",
    kind: "page",
    path: "/about",
  },
] satisfies SearchEntry[]

export const prerender = true

export const GET: APIRoute = async () => {
  const entries = await getPublishedGardenEntries()
  const gardenPosts = entries.map((entry) => ({
    content: plainText(entry.rendered?.html ?? ""),
    description: entry.data.description,
    kind: "garden" as const,
    path: `/garden/${entry.id}`,
    tags: entry.data.tags,
    title: entry.data.title,
  }))
  const index: SearchEntry[] = [...sitePages, ...gardenPosts]
  return new Response(JSON.stringify(index), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Type": "application/json; charset=utf-8",
    },
  })
}

function plainText(html: string) {
  return textContent(parseFragment(html)).replace(/\s+/g, " ").trim()
}

function textContent(node: HtmlNode): string {
  if (
    "tagName" in node &&
    ["code", "kbd", "pre", "samp", "script", "style"].includes(node.tagName)
  ) {
    return ""
  }

  if (node.nodeName === "#text" && "value" in node) {
    return node.value
  }

  if ("childNodes" in node) {
    return node.childNodes.map(textContent).join(" ")
  }

  return ""
}
