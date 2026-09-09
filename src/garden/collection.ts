/**
 * Keeps draft filtering and graph-aware rendering consistent across garden pages.
 */
import type { CollectionEntry } from "astro:content"
import { getCollection, render } from "astro:content"

export function getPublishedGardenEntries() {
  return getCollection("garden", ({ data }) => !data.draft)
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
