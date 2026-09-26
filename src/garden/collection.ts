/**
 * Keeps draft filtering and graph-aware rendering consistent across garden pages.
 */
import type { CollectionEntry } from "astro:content"
import { getCollection, render } from "astro:content"
import path from "node:path"

// `?url` imports the asset's URL; `no-inline` keeps it as a separate file instead
// of embedding its contents in a base64 data URL. The query also bypasses Astro's
// dev navigation guard, so following the link in a browser works locally.
// See:
//   - https://vite.dev/guide/assets.html#explicit-url-imports
//   - https://vite.dev/guide/assets.html#explicit-inline-handling
const jsonAssetUrls = import.meta.glob<string>(
  "/data/garden/_assets/**/*.json",
  { eager: true, import: "default", query: "?url&no-inline" },
)

export async function getPublishedGardenEntries() {
  const entries = await getCollection("garden", ({ data }) => !data.draft)
  return entries.map(resolveJsonAssetLinks)
}

function resolveJsonAssetLinks(entry: CollectionEntry<"garden">) {
  if (!entry.filePath || !entry.rendered) return entry

  const directory = path.posix.dirname(entry.filePath)
  const html = entry.rendered.html.replace(
    /href="([^"]+\.json)"/g,
    (link, href: string) => {
      if (href.startsWith("/") || /^[a-z][a-z\d+.-]*:/i.test(href)) return link

      const assetPath = `/${path.posix.normalize(path.posix.join(directory, href))}`
      if (!assetPath.startsWith("/data/garden/_assets/")) return link

      const url = jsonAssetUrls[assetPath]
      if (!url) throw new Error(`Missing garden asset: ${assetPath}`)
      return `href="${url}"`
    },
  )

  return { ...entry, rendered: { ...entry.rendered, html } }
}

export function gardenTendedDate(entry: CollectionEntry<"garden">) {
  return entry.data.updated ?? entry.data.created
}

export async function renderGardenEntry(entry: CollectionEntry<"garden">) {
  const rendered = await render(entry)
  const graph = rendered.remarkPluginFrontmatter.garden ?? {
    backlinks: [],
    outgoingLinks: [],
  }
  const readingTime = rendered.remarkPluginFrontmatter.readingTime

  if (typeof readingTime !== "string") {
    throw new Error(
      `Reading time is unavailable for garden post "${entry.id}".`,
    )
  }

  return {
    ...rendered,
    graph,
    readingTime,
    hasMermaid: rendered.remarkPluginFrontmatter.hasMermaid === true,
  }
}
