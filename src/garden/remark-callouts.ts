/** Transforms supported Obsidian callouts before Markdown becomes HTML. */

interface MarkdownNodeData extends Record<string, unknown> {
  hName?: string
  hProperties?: Record<string, unknown>
}

interface MarkdownNode {
  children?: MarkdownNode[]
  data?: MarkdownNodeData
  type: string
  url?: string
  value?: string
}

/** Supported Obsidian markers: [!note], [!tip], [!warning], and [!quote]. */
const supportedCallouts = new Set(["note", "tip", "warning", "quote"])
const calloutIcons: Record<string, string> = {
  note: "※",
  tip: "✦",
  warning: "!",
  quote: "“",
}
const calloutMarker = /^\[!([A-Za-z][\w-]*)\][ \t]*/

function textNode(value: string): MarkdownNode {
  return {
    type: "text",
    value,
  }
}

function iconNode(type: string): MarkdownNode {
  return {
    type: "emphasis",
    data: {
      hName: "span",
      hProperties: {
        ariaHidden: "true",
        className: ["callout-icon"],
      },
    },
    children: [textNode(calloutIcons[type])],
  }
}

/** Treats a final standalone link as the quote's attribution. */
function quoteCitation(node: MarkdownNode) {
  if (node.type !== "paragraph" || node.children?.length !== 1) {
    return
  }

  const [link] = node.children
  if (link.type !== "link" || !link.url) {
    return
  }

  return {
    link,
    url: link.url,
  }
}

function transformQuote(node: MarkdownNode) {
  const quoteChildren = node.children?.slice(1) ?? []
  const citation = quoteChildren.length
    ? quoteCitation(quoteChildren.at(-1)!)
    : undefined

  if (citation) {
    quoteChildren.pop()
  }

  node.data = {
    ...(node.data ?? {}),
    hName: "figure",
    hProperties: {
      className: ["callout", "callout--quote"],
      dataCallout: "quote",
    },
  }
  node.children = [
    iconNode("quote"),
    {
      type: "blockquote",
      children: quoteChildren,
      ...(citation
        ? {
            data: {
              hProperties: { cite: citation.url },
            },
          }
        : {}),
    },
    ...(citation
      ? [
          {
            type: "paragraph",
            data: {
              hName: "figcaption",
              hProperties: { className: ["callout-citation"] },
            },
            children: [
              {
                type: "emphasis",
                data: { hName: "cite" },
                children: [citation.link],
              },
            ],
          },
        ]
      : []),
  ]
}

function transformBlockquote(node: MarkdownNode) {
  if (node.type !== "blockquote") {
    return
  }

  const first = node.children?.[0]
  if (first?.type !== "paragraph") {
    return
  }

  const markerText = first.children?.[0]
  if (markerText?.type !== "text" || !markerText.value) {
    return
  }

  const marker = markerText.value.match(calloutMarker)
  if (!marker) {
    return
  }

  const type = marker[1].toLowerCase()
  if (!supportedCallouts.has(type)) {
    return
  }

  const remaining = markerText.value.slice(marker[0].length)
  const newline = remaining.indexOf("\n")
  const titleText = newline === -1 ? remaining : remaining.slice(0, newline)
  const bodyText = newline === -1 ? "" : remaining.slice(newline + 1)
  const trailingChildren = first.children?.slice(1) ?? []
  const titleChildren = [
    ...(titleText ? [textNode(titleText)] : []),
    ...(newline === -1 ? trailingChildren : []),
  ]

  first.children = [
    iconNode(type),
    ...(titleChildren.length
      ? titleChildren
      : [
          textNode(
            type.replace(/^\p{Letter}/u, (letter) => letter.toUpperCase()),
          ),
        ]),
  ]
  first.data = {
    ...(first.data ?? {}),
    hProperties: {
      ...(first.data?.hProperties ?? {}),
      className: ["callout-title"],
    },
  }

  if (newline !== -1) {
    const bodyChildren = [
      ...(bodyText ? [textNode(bodyText)] : []),
      ...trailingChildren,
    ]

    if (bodyChildren.length) {
      node.children?.splice(1, 0, {
        type: "paragraph",
        children: bodyChildren,
      })
    }
  }

  if (type === "quote") {
    transformQuote(node)
    return
  }

  node.data = {
    ...(node.data ?? {}),
    hProperties: {
      ...(node.data?.hProperties ?? {}),
      className: ["callout", `callout--${type}`],
      dataCallout: type,
    },
  }
}

function transform(node: MarkdownNode) {
  transformBlockquote(node)

  for (const child of node.children ?? []) {
    transform(child)
  }
}

export function remarkCallouts() {
  return (tree: MarkdownNode) => transform(tree)
}
