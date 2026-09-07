/** Keeps Mermaid fences out of Expressive Code for client-side rendering. */

interface MarkdownNode {
  children?: MarkdownNode[]
  lang?: string
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
  if (!node.children) {
    return
  }

  node.children = node.children.map((child) => {
    if (child.type === "code" && child.lang?.toLowerCase() === "mermaid") {
      return {
        type: "html",
        value: `<pre class="mermaid">${escapeHtml(child.value ?? "")}</pre>`,
      }
    }

    transform(child)
    return child
  })
}

export function remarkMermaid() {
  return (tree: MarkdownNode) => transform(tree)
}
