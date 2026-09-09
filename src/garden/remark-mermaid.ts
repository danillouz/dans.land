/** Keeps Mermaid fences out of Expressive Code for client-side rendering. */
import type { VFile } from "vfile"

interface MarkdownNode {
  children?: MarkdownNode[]
  lang?: string | null
  type: string
  value?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function transform(node: MarkdownNode) {
  let hasMermaid = false
  if (!node.children) {
    return false
  }

  node.children = node.children.map((child) => {
    if (child.type === "code" && child.lang?.toLowerCase() === "mermaid") {
      hasMermaid = true
      return {
        type: "html",
        value: `<pre class="mermaid">${escapeHtml(child.value ?? "")}</pre>`,
      }
    }

    hasMermaid = transform(child) || hasMermaid
    return child
  })
  return hasMermaid
}

export function remarkMermaid() {
  return (tree: MarkdownNode, file: VFile) => {
    const astro = file.data.astro as
      { frontmatter: Record<string, unknown> } | undefined
    if (!astro?.frontmatter) {
      throw new Error("Astro Markdown frontmatter is unavailable.")
    }
    astro.frontmatter.hasMermaid = transform(tree)
  }
}
