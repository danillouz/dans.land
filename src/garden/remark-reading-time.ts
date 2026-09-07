/** Adds Astro's standard reading-time metadata to garden posts. */

import { toString } from "mdast-util-to-string"
import type { Root } from "mdast"
import getReadingTime from "reading-time"
import type { VFile } from "vfile"

interface GardenFileData {
  frontmatter: Record<string, unknown>
}

export function remarkReadingTime() {
  return (tree: Root, file: VFile) => {
    const astro = file.data.astro as GardenFileData | undefined
    if (!astro?.frontmatter) {
      throw new Error("Astro Markdown frontmatter is unavailable.")
    }

    astro.frontmatter.readingTime = getReadingTime(toString(tree)).text
  }
}
