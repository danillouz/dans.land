/** Keeps Mermaid fences out of Expressive Code for client-side rendering. */
import type { VFile } from "vfile"

interface MarkdownNode {
  children?: MarkdownNode[]
  lang?: string | null
  meta?: string | null
  type: string
  value?: string
}

interface MermaidSize {
  height: number
  width: number
}

interface RemarkMermaidOptions {
  allowMissingSize?: boolean
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

export function parseMermaidSize(meta: string | null | undefined): MermaidSize {
  const width = meta?.match(/(?:^|\s)width=(\d+(?:\.\d+)?)(?:\s|$)/)?.[1]
  const height = meta?.match(/(?:^|\s)height=(\d+(?:\.\d+)?)(?:\s|$)/)?.[1]

  if (!width || !height || Number(width) <= 0 || Number(height) <= 0) {
    throw new Error(
      "Mermaid fences require positive width and height metadata from the rendered SVG viewBox, e.g. ```mermaid width=600 height=400.",
    )
  }

  return {
    width: Number(width),
    height: Number(height),
  }
}

function transform(node: MarkdownNode, options: RemarkMermaidOptions) {
  let hasMermaid = false
  if (!node.children) {
    return false
  }

  node.children = node.children.map((child) => {
    if (child.type === "code" && child.lang?.toLowerCase() === "mermaid") {
      hasMermaid = true
      let size: MermaidSize | undefined
      try {
        size = parseMermaidSize(child.meta)
      } catch (error) {
        if (!options.allowMissingSize) throw error
      }

      // Explicit intrinsic dimensions reserve responsive space while Mermaid
      // renders in the browser. In the future, we could render static SVGs here
      // during the Astro build and remove both the placeholder and client bundle.
      // That requires a DOM-capable build dependency and theme-aware SVG output.
      const frameAttributes = size
        ? ` data-mermaid-width="${size.width}" data-mermaid-height="${size.height}" style="--mermaid-width: ${size.width}px; --mermaid-ratio: ${size.width} / ${size.height}"`
        : ""
      const frameClass = size
        ? "mermaid-frame"
        : "mermaid-frame mermaid-frame--unreserved"
      return {
        type: "html",
        value: `<div class="${frameClass}"${frameAttributes}><pre class="mermaid">${escapeHtml(child.value ?? "")}</pre></div>`,
      }
    }

    hasMermaid = transform(child, options) || hasMermaid
    return child
  })
  return hasMermaid
}

export function remarkMermaid(options: RemarkMermaidOptions = {}) {
  return (tree: MarkdownNode, file: VFile) => {
    const astro = file.data.astro as
      { frontmatter: Record<string, unknown> } | undefined
    if (!astro?.frontmatter) {
      throw new Error("Astro Markdown frontmatter is unavailable.")
    }
    astro.frontmatter.hasMermaid = transform(tree, options)
  }
}
