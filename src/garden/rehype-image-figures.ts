/** Turns standalone Markdown images into captioned article figures. */

interface HastNode {
  children?: HastNode[]
  properties?: Record<string, unknown>
  tagName?: string
  type: string
  value?: string
}

function imageCaption(node: HastNode) {
  if (
    node.type !== "element" ||
    node.tagName !== "p" ||
    node.children?.length !== 1
  ) {
    return null
  }

  const image = node.children[0]
  if (image?.type !== "element" || image.tagName !== "img") {
    return null
  }

  const title = image.properties?.title
  const alt = image.properties?.alt
  const caption =
    typeof title === "string" && title.trim()
      ? title.trim()
      : typeof alt === "string" && alt.trim()
        ? alt.trim()
        : null
  return caption ? { caption, image } : null
}

function wrapImages(node: HastNode) {
  if (!node.children) {
    return
  }

  node.children = node.children.map((child) => {
    const figure = imageCaption(child)
    if (figure) {
      return {
        type: "element",
        tagName: "figure",
        properties: { className: ["post-image"] },
        children: [
          figure.image,
          {
            type: "element",
            tagName: "figcaption",
            properties: { ariaHidden: "true" },
            children: [{ type: "text", value: figure.caption }],
          },
        ],
      }
    }

    wrapImages(child)
    return child
  })
}

export function rehypeImageFigures() {
  return (tree: HastNode) => wrapImages(tree)
}
