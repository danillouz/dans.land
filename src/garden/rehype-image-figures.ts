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
    wrapImages(child)
    const figure = imageCaption(child)
    if (figure) {
      figure.image.properties ??= {}
      // The reading column is 70ch with 1.25rem page gutters; figures retain
      // their native 40px margins on each side.
      figure.image.properties.sizes ??=
        "min(calc(70ch - 80px), calc(100vw - 2.5rem - 80px))"
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

    return child
  })
}

export function rehypeImageFigures() {
  return (tree: HastNode) => wrapImages(tree)
}
