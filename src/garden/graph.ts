import type { CollectionEntry } from "astro:content"

import { renderGardenEntry } from "./collection"

export interface GardenGraphNode {
  connections: number
  href: string
  id: string
  title: string
}

export interface GardenGraphEdge {
  source: string
  target: string
}

export interface GardenGraphData {
  edges: GardenGraphEdge[]
  nodes: GardenGraphNode[]
}

/**
 * Builds the public graph from resolved wikilinks. Connections are undirected
 * for display and deduplicated when two posts link to one another. Every
 * published post remains visible, including posts without connections.
 */
export async function gardenGraph(
  entries: CollectionEntry<"garden">[],
): Promise<GardenGraphData> {
  const rendered = await Promise.all(
    entries.map(async (entry) => ({
      entry,
      graph: (await renderGardenEntry(entry)).graph,
    })),
  )
  const neighbours = new Map(
    entries.map((entry) => [entry.id, new Set<string>()]),
  )
  const edges = new Map<string, GardenGraphEdge>()

  for (const { entry, graph } of rendered) {
    for (const link of graph.outgoingLinks) {
      if (!neighbours.has(link.slug)) {
        continue
      }

      const [source, target] = [entry.id, link.slug].sort()
      const key = `${source}\0${target}`
      edges.set(key, { source, target })
      neighbours.get(source)?.add(target)
      neighbours.get(target)?.add(source)
    }
  }

  return {
    edges: [...edges.values()].sort((left, right) =>
      `${left.source}\0${left.target}`.localeCompare(
        `${right.source}\0${right.target}`,
      ),
    ),
    nodes: entries
      .map((entry) => ({
        connections: neighbours.get(entry.id)?.size ?? 0,
        href: `/garden/${entry.id}`,
        id: entry.id,
        title: entry.data.title,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  }
}
