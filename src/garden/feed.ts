import { experimental_AstroContainer } from "astro/container"
import type { CollectionEntry } from "astro:content"
import { render } from "astro:content"
import type { RSSFeedItem } from "@astrojs/rss"
import {
  parseFragment,
  serialize,
  serializeOuter,
  type DefaultTreeAdapterMap,
} from "parse5"

type HtmlElement = DefaultTreeAdapterMap["element"]
type HtmlNode = DefaultTreeAdapterMap["node"]
type HtmlParent = DefaultTreeAdapterMap["parentNode"]

export async function gardenFeedItems(
  entries: CollectionEntry<"garden">[],
  site: URL,
): Promise<RSSFeedItem[]> {
  // Astro's Container API is experimental, but reusing Content keeps the feed
  // on the site's Markdown and image pipeline instead of duplicating it.
  const container = await experimental_AstroContainer.create()
  const items: RSSFeedItem[] = []

  for (const entry of entries) {
    const url = new URL(`/garden/${entry.id}`, site)
    const { Content } = await render(entry)
    const html = await container.renderToString(Content, {
      request: new Request(url),
    })

    items.push({
      title: entry.data.title,
      description: entry.data.description,
      link: url.href,
      pubDate: entry.data.created,
      categories: entry.data.tags,
      content: feedContent(html, url),
    })
  }

  return items
}

function feedContent(html: string, base: URL) {
  const document = parseFragment(html)
  clean(document)
  return serialize(document)

  function clean(parent: HtmlParent) {
    for (let index = 0; index < parent.childNodes.length;) {
      const node = parent.childNodes[index]

      if (isElement(node) && hasClass(node, "callout--quote")) {
        const quote = simpleQuote(node)
        quote.forEach((child) => (child.parentNode = parent))
        parent.childNodes.splice(index, 1, ...quote)
        continue
      }

      // Interactive Expressive Code frames do not work in feed readers.
      // Keep their titles and source as portable, semantic HTML instead.
      if (isElement(node) && hasClass(node, "expressive-code")) {
        const codeBlock = simpleCodeBlock(node)
        codeBlock.parentNode = parent
        parent.childNodes.splice(index, 1, codeBlock)
        index += 1
        continue
      }

      if (
        isElement(node) &&
        ["button", "link", "script", "style"].includes(node.tagName)
      ) {
        parent.childNodes.splice(index, 1)
        continue
      }

      if (isElement(node)) {
        removeEmptyAttribute(node, "srcset")
        absolutizeAttribute(node, "cite")
        absolutizeAttribute(node, "href")
        absolutizeAttribute(node, "src")
      }

      if ("childNodes" in node) {
        clean(node)
      }

      index += 1
    }
  }

  function simpleQuote(element: HtmlElement) {
    const quote = findElement(
      element,
      (candidate) => candidate.tagName === "blockquote",
    )
    if (!quote) {
      return []
    }

    const citation = findElement(
      element,
      (candidate) => candidate.tagName === "figcaption",
    )
    const link = citation
      ? findElement(citation, (candidate) => candidate.tagName === "a")
      : undefined
    if (link) {
      const fragment = parseFragment(`<footer>${serializeOuter(link)}</footer>`)
      const footer = fragment.childNodes[0]
      footer.parentNode = quote
      quote.childNodes.push(footer)
    }

    return [quote]
  }

  function simpleCodeBlock(element: HtmlElement) {
    const pre = findElement(element, (candidate) => candidate.tagName === "pre")
    const language = pre && attribute(pre, "data-language")
    const lines = pre
      ? findElements(pre, (candidate) => hasClass(candidate, "ec-line"))
      : []
    const code = lines
      .map((line) => {
        const content = findElement(line, (candidate) =>
          hasClass(candidate, "code"),
        )
        const prefix = hasClass(line, "ins")
          ? "+ "
          : hasClass(line, "del")
            ? "- "
            : ""
        return `${prefix}${textContent(content).replace(/\r?\n$/, "")}`
      })
      .join("\n")
    const title = textContent(
      findElement(element, (candidate) => hasClass(candidate, "title")),
    )
    const languageClass = language
      ? ` class="language-${escapeHtml(language)}"`
      : ""
    const caption = title ? `<figcaption>${escapeHtml(title)}</figcaption>` : ""
    const fragment = parseFragment(
      `<figure>${caption}<pre><code${languageClass}>${escapeHtml(code)}</code></pre></figure>`,
    )

    return fragment.childNodes[0]
  }

  function findElement(
    node: HtmlNode,
    predicate: (element: HtmlElement) => boolean,
  ): HtmlElement | undefined {
    if (isElement(node) && predicate(node)) {
      return node
    }

    if ("childNodes" in node) {
      for (const child of node.childNodes) {
        const match = findElement(child, predicate)
        if (match) return match
      }
    }

    return undefined
  }

  function findElements(
    node: HtmlNode,
    predicate: (element: HtmlElement) => boolean,
    matches: HtmlElement[] = [],
  ) {
    if (isElement(node) && predicate(node)) {
      matches.push(node)
    }

    if ("childNodes" in node) {
      node.childNodes.forEach((child) =>
        findElements(child, predicate, matches),
      )
    }

    return matches
  }

  function absolutizeAttribute(element: HtmlElement, name: string) {
    const value = attribute(element, name)
    if (value) {
      element.attrs.find((candidate) => candidate.name === name)!.value =
        new URL(value, base).href
    }
  }

  function removeEmptyAttribute(element: HtmlElement, name: string) {
    const index = element.attrs.findIndex(
      (candidate) => candidate.name === name && !candidate.value,
    )
    if (index !== -1) {
      element.attrs.splice(index, 1)
    }
  }
}

function isElement(node: HtmlNode): node is HtmlElement {
  return "attrs" in node
}

function hasClass(element: HtmlElement, className: string) {
  return attribute(element, "class")?.split(/\s+/).includes(className) ?? false
}

function attribute(element: HtmlElement, name: string) {
  return element.attrs.find((candidate) => candidate.name === name)?.value
}

function textContent(node: HtmlNode | undefined): string {
  if (!node) {
    return ""
  }

  if (node.nodeName === "#text" && "value" in node) {
    return node.value
  }

  if ("childNodes" in node) {
    return node.childNodes.map(textContent).join("")
  }

  return ""
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
