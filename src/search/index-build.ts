import { createHash } from "node:crypto"

import {
  getPublishedGardenEntries,
  prepareGardenEntryForSearch,
} from "../garden/collection"
import type { SearchEntry } from "./types"

export const sitePages = [
  { title: "Home", kind: "page", path: "/" },
  { title: "Garden", kind: "page", path: "/garden" },
  { title: "All garden posts", kind: "page", path: "/garden/all" },
  { title: "About", kind: "page", path: "/about" },
] satisfies SearchEntry[]

type SearchIndex = {
  json: string
  version: string
  url: string
}

let buildPromise: Promise<SearchIndex> | undefined

export function getSearchIndex(): Promise<SearchIndex> {
  if (import.meta.env.DEV) {
    return buildSearchIndex()
  }

  buildPromise ??= buildSearchIndex().catch((error) => {
    buildPromise = undefined
    throw error
  })
  return buildPromise
}

async function buildSearchIndex(): Promise<SearchIndex> {
  const publishedEntries = await getPublishedGardenEntries()
  const gardenEntries = publishedEntries.map((entry) => {
    const path = `/garden/${entry.id}`
    const { searchContent } = prepareGardenEntryForSearch(entry)
    const post: SearchEntry = {
      aliases: entry.data.aliases,
      passages: searchContent.passages,
      description: entry.data.description,
      kind: "garden",
      path,
      sections: searchContent.sections,
      tags: entry.data.tags,
      title: entry.data.title,
    }
    return post
  })
  const entries: SearchEntry[] = [...sitePages, ...gardenEntries]
  const json = JSON.stringify(entries)
  const version = createHash("sha256").update(json).digest("hex")
  return {
    json,
    version,
    url: `/search/${version}.index.json`,
  }
}
