import type { APIRoute } from "astro"
import rss from "@astrojs/rss"

import { getPublishedGardenEntries } from "../garden/collection"
import { gardenFeedItems } from "../garden/feed"

export const GET: APIRoute = async ({ site, url }) => {
  if (!site) {
    throw new Error("Astro's site URL is required")
  }

  const entries = await getPublishedGardenEntries()
  const recent = [...entries].sort(
    (a, b) =>
      b.data.created.getTime() - a.data.created.getTime() ||
      a.data.title.localeCompare(b.data.title),
  )
  const origin = import.meta.env.DEV ? new URL(url.origin) : site
  return rss({
    title: "Dan's Land",
    description: "Dispatches from Dan's Land.",
    site: origin,
    trailingSlash: false,
    items: await gardenFeedItems(recent, origin),
    customData: "<language>en</language>",
  })
}
