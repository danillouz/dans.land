import type { CollectionEntry } from "astro:content"

export interface GardenTreeNode {
  children: GardenTreeNode[]
  href?: string
  id: string
  name: string
}

/** Builds the folder hierarchy used by the garden's compact all-posts view. */
export function gardenTree(
  entries: CollectionEntry<"garden">[],
): GardenTreeNode {
  const root: GardenTreeNode = {
    children: [],
    id: "",
    name: "Garden",
  }

  for (const entry of entries) {
    let branch = root
    const segments = entry.id.split("/")

    for (const [index, segment] of segments.entries()) {
      let child = branch.children.find(({ id }) => id === segment)

      if (!child) {
        const isPost = index === segments.length - 1
        child = {
          children: [],
          href: isPost ? `/garden/${entry.id}` : undefined,
          id: segment,
          name: isPost ? entry.data.title : segment.replaceAll("-", " "),
        }
        branch.children.push(child)
      }

      branch = child
    }
  }

  return root
}
