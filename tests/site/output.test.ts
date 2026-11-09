import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import test from "node:test"

import { parseFrontmatter } from "@astrojs/markdown-remark"
import { parse, type DefaultTreeAdapterMap } from "parse5"

import { canonicalizeSlug } from "../../src/garden/links.ts"
import {
  prepareSearchIndex,
  searchEntries,
  searchResultHref,
} from "../../src/search/client.ts"
import type { SearchEntry } from "../../src/search/types.ts"

type HtmlDocument = DefaultTreeAdapterMap["document"]
type HtmlElement = DefaultTreeAdapterMap["element"]
type HtmlNode = DefaultTreeAdapterMap["node"]

const pages = [
  {
    path: "dist/index.html",
    title: "Dan's Land",
    description:
      "Dan's Land is the personal site of Daniël Illouz: a fantasy realm of ASCII landscapes, backend engineering, immortal Gophers, and cinnamon buns.",
    canonical: "https://dans.land/",
    openGraphType: "website",
    structuredDataType: "WebSite",
  },
  {
    path: "dist/about.html",
    title: "Daniël Illouz",
    description:
      "Daniël Illouz is a backend engineer at Framer specializing in Go, high-performance backend systems, networking, and large-scale web infrastructure.",
    canonical: "https://dans.land/about",
    openGraphType: "profile",
    structuredDataType: "ProfilePage",
  },
]
for (const expected of pages) {
  test(`${expected.path} keeps its document metadata and shared shell`, async () => {
    const { document } = await builtPage(expected.path)
    const html = element(document, (node) => node.tagName === "html")
    const title = element(document, (node) => node.tagName === "title")
    const canonical = element(
      document,
      (node) =>
        node.tagName === "link" && attribute(node, "rel") === "canonical",
    )
    const structuredData = element(
      document,
      (node) =>
        node.tagName === "script" &&
        attribute(node, "type") === "application/ld+json",
    )

    assert.equal(attribute(html, "lang"), "en")
    assert.equal(textContent(title), expected.title)
    assert.equal(
      metaContent(document, "name", "description"),
      expected.description,
    )
    assert.equal(attribute(canonical, "href"), expected.canonical)
    assert.equal(
      metaContent(document, "property", "og:type"),
      expected.openGraphType,
    )
    assert.equal(
      metaContent(document, "property", "og:description"),
      expected.description,
    )
    assert.equal(
      metaContent(document, "name", "twitter:description"),
      expected.description,
    )
    assert.equal(
      JSON.parse(textContent(structuredData))["@type"],
      expected.structuredDataType,
    )
    assert.equal(
      elements(document, (node) => node.tagName === "main").length,
      1,
    )
    assert.equal(
      elements(document, (node) => node.tagName === "footer").length,
      1,
    )
    assert.ok(
      element(
        document,
        (node) =>
          node.tagName === "a" &&
          attribute(node, "href") === "https://github.com/danillouz/dans.land/",
      ),
    )
  })
}

test("the 404 keeps its intentionally minimal metadata", async () => {
  const { document } = await builtPage("dist/404.html")
  const title = element(document, (node) => node.tagName === "title")

  assert.equal(textContent(title), "Hic sunt dracones")
  assert.equal(metaContent(document, "name", "robots"), "noindex")
  assert.equal(metaContent(document, "name", "description"), undefined)
  assert.equal(metaContent(document, "property", "og:type"), undefined)
  assert.equal(metaContent(document, "name", "twitter:card"), undefined)
  assert.equal(
    elements(
      document,
      (node) =>
        node.tagName === "link" && attribute(node, "rel") === "canonical",
    ).length,
    0,
  )
  assert.equal(
    elements(
      document,
      (node) =>
        node.tagName === "script" &&
        attribute(node, "type") === "application/ld+json",
    ).length,
    0,
  )
})

test("garden landing has social metadata", async () => {
  const { document } = await builtPage("dist/garden.html")
  const title = element(document, (node) => node.tagName === "title")

  assert.equal(textContent(title), "Garden of Knowledge")
  assert.equal(
    metaContent(document, "name", "description"),
    "Dan's digital garden.",
  )
  assert.equal(metaContent(document, "property", "og:type"), "website")
  assert.equal(
    metaContent(document, "name", "twitter:title"),
    "Garden of Knowledge",
  )
  assert.equal(
    metaContent(document, "property", "og:image"),
    "https://dans.land/social.png",
  )
  assert.equal(
    elements(
      document,
      (node) =>
        node.tagName === "script" &&
        attribute(node, "type") === "application/ld+json",
    ).length,
    0,
  )
})

test("garden articles expose social and Article metadata", async () => {
  const { document } = await builtPage("dist/garden/computer-networks/dns.html")
  const title = element(document, (node) => node.tagName === "title")
  const structuredData = element(
    document,
    (node) =>
      node.tagName === "script" &&
      attribute(node, "type") === "application/ld+json",
  )
  const article = JSON.parse(textContent(structuredData))

  assert.equal(textContent(title), "DNS")
  assert.equal(metaContent(document, "property", "og:type"), "article")
  assert.equal(
    metaContent(document, "property", "og:url"),
    "https://dans.land/garden/computer-networks/dns",
  )
  assert.equal(metaContent(document, "name", "twitter:title"), "DNS")
  assert.equal(
    metaContent(document, "property", "og:image"),
    "https://dans.land/social.png",
  )
  assert.equal(article["@type"], "Article")
  assert.equal(article.headline, "DNS")
  assert.equal(article.datePublished, "2023-06-03T00:00:00.000Z")
  assert.equal(article.dateModified, "2026-09-13T00:00:00.000Z")
  assert.deepEqual(article.author, {
    "@type": "Person",
    "@id": "https://dans.land/#danillouz",
    name: "Daniël Illouz",
    url: "https://dans.land/about",
  })
})

test("the about portrait uses Astro's image pipeline", async () => {
  const { document } = await builtPage("dist/about.html")
  const picture = element(document, (node) => node.tagName === "picture")
  const sources = elements(picture, (node) => node.tagName === "source")
  const image = element(picture, (node) => node.tagName === "img")
  const structuredData = element(
    document,
    (node) =>
      node.tagName === "script" &&
      attribute(node, "type") === "application/ld+json",
  )
  const imageCandidates = sources.flatMap((source) => {
    assert.ok(attribute(source, "sizes"))
    return parseSrcset(attribute(source, "srcset"))
  })
  assert.ok(attribute(image, "sizes"))
  imageCandidates.push(...parseSrcset(attribute(image, "srcset")))

  assert.deepEqual(
    sources.map((source) => attribute(source, "type")),
    ["image/avif", "image/webp"],
  )
  assert.equal(attribute(image, "class"), "portrait-image")
  assert.ok(attribute(image, "width"))
  assert.ok(attribute(image, "height"))
  assert.equal(attribute(image, "loading"), "eager")
  assert.equal(attribute(image, "decoding"), "sync")
  assert.equal(attribute(image, "fetchpriority"), "high")

  for (const { path, width } of imageCandidates) {
    assert.match(path, /^\/assets\/portrait\..+\.(avif|webp|png)$/)
    assert.ok(width > 0)
    await readFile(`dist${path}`)
  }

  const imagePath = attribute(image, "src")
  assert.ok(imagePath)
  assert.match(imagePath, /^\/assets\/portrait\..+\.(avif|webp|png)$/)
  await readFile(`dist${imagePath}`)

  const profileImage = new URL(
    JSON.parse(textContent(structuredData)).mainEntity.image,
  )
  assert.equal(profileImage.origin, "https://dans.land")
  assert.match(profileImage.pathname, /^\/assets\/portrait\..+\.png$/)
  await readFile(`dist${profileImage.pathname}`)
})

const preBaselines = [
  [
    "dist/index.html",
    "id",
    "banner",
    "25818add31d9ae3a44f98d7e8a7e700a1539ba18204355c9bacdcfd4fa3ab770",
  ],
  [
    "dist/index.html",
    "id",
    "gate",
    "7bfa34fe8acb7dd4993652ec948d926f3ce4ec386112aeb72eb7b2a7913930f1",
  ],
  [
    "dist/index.html",
    "id",
    "sun",
    "73e1d9f6316ffa5ef55d416fbaa2c34ae5ef9abcc566eccf17bd224e578bb825",
  ],
  [
    "dist/index.html",
    "id",
    "moon",
    "b77feb59796374afe7865b2a284d74ed05be233d8e31bcf4a5721ba42130bbb1",
  ],
  [
    "dist/index.html",
    "id",
    "tower",
    "3dcd3170e058f3e7b8c2909e739d9bcf50eb6562ecc0eeee454abd2565cb3da5",
  ],
  [
    "dist/index.html",
    "id",
    "map",
    "f5545ce21c43b3f0da1b8dcec687c342b07f810940def037e0256410d31fb153",
  ],
  [
    "dist/index.html",
    "id",
    "map-legend",
    "d3aff0b9782aef47696e8123b442503f6217891bf056b1d40766a7108dfc6efa",
  ],
  [
    "dist/about.html",
    "id",
    "warden-banner",
    "7e2e26a02dc1f691d82c237d4308fa665cbb4276400f36449847379387ad7cbb",
  ],
  [
    "dist/404.html",
    "class",
    "not-found-dragon",
    "e39d9ac2d2c4454b868118692ef58df6508defc2948540a2487c14d92100111f",
  ],
  [
    "dist/garden.html",
    "id",
    "garden-banner",
    "9e23142f5ad79527bfaede1ed64560263ffacac348d45cd75d3decc56b943574",
  ],
]
for (const [path, key, value, expectedHash] of preBaselines) {
  test(`${path} preserves the visible spacing in ${value}`, async () => {
    const { document } = await builtPage(path)
    const pre = element(
      document,
      (node) =>
        node.tagName === "pre" &&
        (attribute(node, key)?.split(" ").includes(value) ?? false),
    )

    assert.ok(pre)
    assert.equal(sha256(textContent(pre)), expectedHash)
  })
}

test("Astro emits all pages and deployment files", async () => {
  const paths = [
    "dist/index.html",
    "dist/about.html",
    "dist/404.html",
    "dist/garden/all.html",
    "dist/_headers",
    "dist/robots.txt",
    "dist/rss.xml",
    "dist/sitemap-index.xml",
    "dist/sitemap-0.xml",
  ]
  await Promise.all(paths.map((path) => readFile(path)))
})

test("articles inline small styles without loading web fonts", async () => {
  const { document } = await builtPage("dist/garden/go/http-handlers.html")
  const inlineStyles = elements(document, (node) => node.tagName === "style")
    .map(textContent)
    .join("\n")
  const preloads = elements(
    document,
    (node) =>
      node.tagName === "link" &&
      attribute(node, "rel") === "preload" &&
      attribute(node, "as") === "font",
  )

  assert.equal(preloads.length, 0)
  assert.doesNotMatch(inlineStyles, /@font-face/)
  assert.match(inlineStyles, /\.post-description/)
})

test("each main page only loads its own component styles", async () => {
  const home = await builtPage("dist/index.html")
  const about = await builtPage("dist/about.html")
  const notFound = await builtPage("dist/404.html")
  const [homeCss, aboutCss, notFoundCss] = await Promise.all([
    builtStyles(home.document),
    builtStyles(about.document),
    builtStyles(notFound.document),
  ])

  assert.match(homeCss, /\.page-intro/)
  assert.match(homeCss, /\.ascii-art/)
  assert.match(homeCss, /\.banner/)
  assert.doesNotMatch(homeCss, /\.portrait/)
  assert.doesNotMatch(homeCss, /\.not-found-panel/)

  assert.match(aboutCss, /\.portrait/)
  assert.match(aboutCss, /\.placard/)
  assert.match(aboutCss, /\.portrait-exhibit/)
  assert.match(aboutCss, /\.page-intro/)
  assert.match(aboutCss, /\.profile-copy/)
  assert.match(aboutCss, /\.ascii-art/)
  assert.doesNotMatch(aboutCss, /\.not-found-panel/)

  assert.match(notFoundCss, /\.not-found-panel/)
  assert.match(notFoundCss, /\.banner/)
  assert.doesNotMatch(notFoundCss, /\.ascii-art/)
  assert.doesNotMatch(notFoundCss, /\.portrait/)
})

test("the all-posts page replaces the separate garden views", async () => {
  await Promise.all([
    assert.rejects(readFile("dist/garden/catalog.html", "utf8")),
    assert.rejects(readFile("dist/garden/graph.html", "utf8")),
    assert.rejects(readFile("dist/garden/observatory.html", "utf8")),
  ])
})

test("the homepage points its garden links at the local garden", async () => {
  const homepage = await readFile("dist/index.html", "utf8")
  assert.match(homepage, /href="\/garden"/)
  assert.doesNotMatch(homepage, /garden\.dans\.land/)
})

test("the homepage preserves spaces around inline links", async () => {
  const { document } = await builtPage("dist/index.html")
  const main = element(document, (node) => node.tagName === "main")

  assert.match(
    textContent(main).replace(/\s+/g, " "),
    /legendary builders of Framer from my Fortress of Contemplation/,
  )
})

test("every page shares the full header and footer shell", async () => {
  for (const [path, expectedActiveLinks] of [
    ["dist/index.html", [["/", "page"]]],
    ["dist/about.html", [["/about", "page"]]],
    ["dist/404.html", []],
    ["dist/garden.html", [["/garden", "page"]]],
    ["dist/garden/all.html", [["/garden", "location"]]],
    ["dist/garden/cache-stampeding.html", [["/garden", "location"]]],
  ] as const) {
    const { document } = await builtPage(path)
    const header = element(
      document,
      (node) =>
        node.tagName === "header" && attribute(node, "class") === "site-header",
    )
    const footer = element(
      document,
      (node) =>
        node.tagName === "footer" && attribute(node, "class") === "site-footer",
    )
    const body = element(document, (node) => node.tagName === "body")

    assert.equal(attribute(body, "id"), "top")
    const primaryNav = element(
      header,
      (node) =>
        node.tagName === "nav" && attribute(node, "aria-label") === "Primary",
    )
    const navLinks = elements(
      primaryNav,
      (node) =>
        node.tagName === "a" &&
        (attribute(node, "class")?.split(/\s+/).includes("nav-link") ?? false),
    )
    assert.deepEqual(
      navLinks.map((link) => [attribute(link, "href"), textContent(link).trim()]),
      [
        ["/", "Home"],
        ["/garden", "Garden"],
        ["/about", "About"],
      ],
    )
    assert.deepEqual(
      navLinks
        .filter((link) => attribute(link, "aria-current") !== undefined)
        .map((link) => [attribute(link, "href"), attribute(link, "aria-current")]),
      expectedActiveLinks,
      `Active navigation links in ${path}`,
    )
    const searchButton = element(
      header,
      (node) =>
        node.tagName === "button" &&
        attribute(node, "data-search-open") !== undefined,
    )
    assert.equal(attribute(searchButton, "aria-label"), "Search")
    assert.equal(
      attribute(searchButton, "title"),
      "I'm Crumb. The tiniest and sole Steward of Dan's Land.",
    )
    const searchPetFaces = elements(
      searchButton,
      (node) =>
        node.tagName === "span" &&
        ["search-pet-idle", "search-pet-active"].includes(
          attribute(node, "class") ?? "",
        ),
    ).map((face) => textContent(face))
    assert.deepEqual(searchPetFaces, ["ᴖᴗᴖ", ">ᴗ<"])
    assert.ok(
      element(
        footer,
        (node) => node.tagName === "a" && attribute(node, "href") === "#top",
      ),
    )
  }
})

test("search restores Crumb's command navigation semantics", async () => {
  const { document } = await builtPage("dist/index.html")
  const trigger = element(
    document,
    (node) => attribute(node, "data-search-open") !== undefined,
  )
  const input = element(
    document,
    (node) =>
      node.tagName === "input" &&
      attribute(node, "data-search-input") !== undefined,
  )
  const results = element(
    document,
    (node) =>
      node.tagName === "div" && attribute(node, "id") === "search-results",
  )
  const scrollArea = element(
    document,
    (node) => attribute(node, "data-search-scroll") !== undefined,
  )
  assert.equal(attribute(input, "role"), "combobox")
  assert.equal(attribute(input, "placeholder"), "Search Dan's Land...")
  assert.equal(attribute(input, "autocapitalize"), "none")
  assert.equal(attribute(input, "spellcheck"), "false")
  assert.equal(attribute(input, "aria-controls"), "search-results")
  assert.equal(attribute(input, "aria-autocomplete"), "list")
  assert.equal(attribute(input, "aria-expanded"), "false")
  assert.equal(attribute(results, "role"), "listbox")
  assert.equal(attribute(results, "tabindex"), undefined)
  assert.equal(attribute(scrollArea, "tabindex"), "-1")
  const shortcuts = element(
    results,
    (node) => attribute(node, "data-search-shortcuts") !== undefined,
  )
  assert.equal(attribute(shortcuts, "hidden"), undefined)
  assert.equal(attribute(shortcuts, "role"), "group")
  const shortcutsHeading = element(
    shortcuts,
    (node) =>
      node.tagName === "h3" &&
      (attribute(node, "class")
        ?.split(/\s+/)
        .includes("search-group-heading") ??
        false),
  )
  assert.equal(
    attribute(shortcuts, "aria-labelledby"),
    attribute(shortcutsHeading, "id"),
  )
  assert.match(textContent(shortcutsHeading), /^Pages\s*4$/)
  assert.deepEqual(
    elements(shortcuts, (node) => node.tagName === "a").map((link) => [
      attribute(link, "href"),
      attribute(link, "role"),
      attribute(link, "tabindex"),
    ]),
    [
      ["/", "option", "-1"],
      ["/garden", "option", "-1"],
      ["/garden/all", "option", "-1"],
      ["/about", "option", "-1"],
    ],
  )
  const help = element(
    scrollArea,
    (node) => attribute(node, "id") === "search-help",
  )
  assert.match(textContent(help).replace(/\s+/g, " "), /↑.*↓.*roam/)
  assert.equal(
    elements(
      scrollArea,
      (node) => attribute(node, "data-search-results") !== undefined,
    ).length,
    1,
  )
  assert.equal(
    elements(scrollArea, (node) => attribute(node, "id") === "search-help")
      .length,
    1,
  )
  assert.equal(
    elements(
      document,
      (node) => attribute(node, "data-search-more") !== undefined,
    ).length,
    0,
  )
  const close = element(
    document,
    (node) => attribute(node, "data-search-close") !== undefined,
  )
  assert.equal(close.tagName, "button")
  assert.equal(attribute(close, "aria-label"), "Close search")
  assert.equal(
    elements(
      document,
      (node) => attribute(node, "data-search-retry") !== undefined,
    ).length,
    1,
  )
})

test("the search index contains pages and published garden content", async () => {
  const index = await builtSearchIndex()
  const handlers = index.find(
    (entry) => entry.path === "/garden/go/http-handlers",
  )
  assert.ok(index.length > 0)
  assert.ok(index.every((entry) => ["page", "garden"].includes(entry.kind)))
  assert.equal(new Set(index.map((entry) => entry.path)).size, index.length)
  assert.ok(
    index.some(
      (entry) =>
        entry.path === "/about" &&
        entry.kind === "page" &&
        entry.title === "About" &&
        !("description" in entry) &&
        !("passages" in entry),
    ),
  )
  assert.ok(
    index.some(
      (entry) =>
        entry.path === "/garden/computer-networks/dns" &&
        entry.kind === "garden" &&
        entry.title === "DNS" &&
        entry.passages.some(({ text }) => text.includes("massive system")),
    ),
  )
  assert.ok(index.every((entry) => !entry.path.includes("/_drafts/")))
  assert.ok(index.every((entry) => !("href" in entry)))
  assert.ok(handlers)
  assert.equal(handlers.kind, "garden")
  assert.doesNotMatch(
    handlers.passages.map(({ text }) => text).join(" "),
    /package main|ListenAndServe/,
  )
  assert.ok(handlers.sections.some(({ id }) => id === "search-hit-servemux"))

  const { document: article } = await builtPage(
    "dist/garden/go/http-handlers.html",
  )
  assert.ok(
    handlers.passages.every(({ text }) =>
      textContent(article).replace(/\s+/g, " ").includes(text),
    ),
  )
  for (const [query, path] of [
    ["Atuin", "/garden/dotfiles#search-hit-atuin"],
    ["Handler", "/garden/go/http-handlers#search-hit-handler"],
    ["Help", "/garden/sqlite-cli#search-hit-help"],
  ]) {
    const hit = searchEntries(prepareSearchIndex(index), query).entries.find(
      (entry) => entry.kind === "garden" && entry.matchPath === path,
    )
    assert.ok(hit, `Exact section search should open ${path}`)
  }

  assert.equal(
    searchEntries(
      prepareSearchIndex(index),
      "go permissions",
      Infinity,
    ).entries.some(
      (entry) => entry.path === "/garden/lambda/audio-transcoding",
    ),
    false,
  )
  const genericGoHit = searchEntries(
    prepareSearchIndex(index),
    "go",
    Infinity,
  ).entries.find((entry) => entry.path === "/garden/go/benchmarking")
  assert.ok(genericGoHit)
  assert.equal(genericGoHit.kind, "garden")
  assert.notEqual(
    genericGoHit.matchPath,
    "/garden/go/benchmarking#search-hit-gotchas",
  )

  const footnote = "http.ServeMux also satisfies the http.Handler interface"
  assert.equal(
    handlers.passages.filter(({ text }) => text.startsWith(footnote)).length,
    1,
  )
  assert.ok(
    index
      .filter((entry) => entry.kind === "garden")
      .every((entry) =>
        entry.passages.every(
          ({ text }) => !text.includes("※") && !text.includes("↩"),
        ),
      ),
  )
})

test("indexed passages and sections point to search targets in the built page", async () => {
  const index = await builtSearchIndex()
  for (const post of index.filter((entry) => entry.kind === "garden")) {
    const { document } = await builtPage(`dist${post.path}.html`)
    for (const { id } of post.passages) {
      const target = element(document, (node) => attribute(node, "id") === id)
      assert.ok(target, `Missing indexed target: ${post.path}#${id}`)
      assert.equal(attribute(target, "data-search-hit"), "")
    }
    for (const { id } of post.sections) {
      assert.match(id, /^search-hit-/)
      const target = element(document, (node) => attribute(node, "id") === id)
      assert.ok(target, `Missing indexed section anchor: ${post.path}#${id}`)
      assert.equal(target.tagName, "span")
      assert.equal(attribute(target, "data-search-hit-anchor"), "")
      const heading = target.parentNode
      assert.ok(
        heading && "tagName" in heading,
        `Missing parent heading: ${post.path}#${id}`,
      )
      assert.ok(["h2", "h3", "h4", "h5", "h6"].includes(heading.tagName))
      assert.equal(attribute(heading, "data-search-hit"), undefined)
      const headingId = attribute(heading, "id")
      assert.ok(headingId)
      assert.ok(
        elements(
          heading,
          (node) =>
            node.tagName === "a" &&
            attribute(node, "class")?.split(/\s+/).includes("heading-link") ===
              true &&
            attribute(node, "href") === `#${headingId}`,
        ).length > 0,
        `Heading link changed: ${post.path}#${headingId}`,
      )
    }
  }
})

test("the UI loads a fingerprinted index with immutable caching", async () => {
  const { document } = await builtPage("dist/index.html")
  const dialog = element(
    document,
    (node) => attribute(node, "data-site-search") !== undefined,
  )
  const url = attribute(dialog, "data-search-index")
  assert.ok(url)
  assert.match(url, /^\/search\/[a-f0-9]{64}\.index\.json$/)
  const json = await readFile(`dist${url}`, "utf8")
  assert.equal(url, `/search/${sha256(json)}.index.json`)
  const headers = await readFile("dist/_headers", "utf8")
  assert.match(
    headers,
    /\/search\/\*\s+Cache-Control: public, max-age=31536000, immutable/,
  )
})

test("visible figure captions can link directly to the matching figure", async () => {
  const index = await builtSearchIndex()
  const entries = prepareSearchIndex(index)
  const query = "frames added last removed first"
  const hit = searchEntries(entries, query, 100).entries.find(
    (entry) => entry.path === "/garden/lambda/nodejs-event-loop",
  )
  assert.ok(hit)
  assert.equal(hit.kind, "garden")
  assert.ok(hit.matchPath)
  assert.match(
    searchResultHref(hit),
    /^\/garden\/lambda\/nodejs-event-loop#search-hit-\d+$/,
  )
  assert.equal(
    searchEntries(entries, "last in first out", Infinity).entries.some(
      (entry) => entry.path === "/garden/lambda/nodejs-event-loop",
    ),
    false,
  )
})

test("garden routes only load their own styles", async () => {
  const landing = await builtPage("dist/garden.html")
  const all = await builtPage("dist/garden/all.html")
  const post = await builtPage("dist/garden/cache-stampeding.html")
  const [landingCss, allCss, postCss] = await Promise.all([
    builtStyles(landing.document),
    builtStyles(all.document),
    builtStyles(post.document),
  ])

  assert.match(landingCss, /\.site-header/)
  assert.match(landingCss, /\.site-footer/)
  assert.doesNotMatch(landingCss, /\.banner/)
  assert.match(landingCss, /\.frame-corner/)
  assert.match(landingCss, /\.page-intro/)
  assert.match(landingCss, /\.garden-about/)
  assert.match(landingCss, /\.recent-list/)
  assert.doesNotMatch(landingCss, /\.tree/)
  assert.doesNotMatch(landingCss, /\.post-content/)
  assert.doesNotMatch(landingCss, /\.backlinks/)
  assert.doesNotMatch(landingCss, /\.toc-rail/)

  assert.match(allCss, /\.garden-graph/)
  assert.match(allCss, /\.all-tree/)
  assert.match(allCss, /\.tree/)
  assert.doesNotMatch(allCss, /@keyframes twinkle/)
  assert.match(allCss, /prefers-reduced-motion:reduce/)
  assert.doesNotMatch(allCss, /\.garden-about/)
  assert.doesNotMatch(allCss, /\.frame-corner/)
  assert.doesNotMatch(allCss, /\.recent-list/)
  assert.doesNotMatch(allCss, /\.post-content/)
  assert.doesNotMatch(allCss, /\.toc-rail/)

  assert.match(postCss, /\.site-header/)
  assert.match(postCss, /\.site-footer/)
  assert.match(postCss, /\.post-header/)
  assert.match(postCss, /\.post-content/)
  assert.match(postCss, /\.post-image/)
  assert.match(postCss, /\.footnotes/)
  assert.match(postCss, /border-collapse:collapse/)
  assert.match(postCss, /\.backlinks/)
  assert.match(postCss, /\.toc-rail/)
  assert.doesNotMatch(postCss, /\.page-intro/)
  assert.doesNotMatch(postCss, /\.tree/)
  assert.doesNotMatch(postCss, /\.recent-list/)
})

test("the generated sitemap contains every public route", async () => {
  const sitemap = await readFile("dist/sitemap-0.xml", "utf8")
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => match[1])
    .sort()
  const gardenUrls = await publishedGardenUrls()

  assert.deepEqual(
    urls,
    [
      "https://dans.land/",
      "https://dans.land/about",
      "https://dans.land/garden",
      "https://dans.land/garden/all",
      ...gardenUrls,
    ].sort(),
  )
})

test("the site-wide RSS feed contains published garden posts", async () => {
  const [homepage, feed] = await Promise.all([
    builtPage("dist/index.html"),
    readFile("dist/rss.xml", "utf8"),
  ])
  const discovery = element(
    homepage.document,
    (node) =>
      node.tagName === "link" &&
      attribute(node, "rel") === "alternate" &&
      attribute(node, "type") === "application/rss+xml",
  )

  assert.equal(attribute(discovery, "href"), "https://dans.land/rss.xml")
  assert.equal(attribute(discovery, "title"), "Dan's Land")
  assert.match(feed, /<title>Dan&apos;s Land<\/title>/)
  assert.match(
    feed,
    /<channel>[\s\S]*?<link>https:\/\/dans\.land<\/link><language>/,
  )
  assert.match(feed, /<link>https:\/\/dans\.land\/garden\/[^<]+<\/link>/)
  assert.match(feed, /<content:encoded>/)
  assert.match(feed, /src=&quot;https:\/\/dans\.land\/assets\//)
  const imageCandidates = [...feed.matchAll(/srcset=&quot;([^&]+)&quot;/g)]
  assert.ok(imageCandidates.length > 0)
  for (const [, srcset] of imageCandidates) {
    for (const candidate of srcset.split(",")) {
      assert.match(candidate.trim(), /^https:\/\/dans\.land\/assets\/\S+ \d+w$/)
    }
  }
  assert.match(feed, /&lt;pre&gt;&lt;code class=&quot;language-/)
  assert.match(feed, /&lt;blockquote cite=&quot;https:/)
  assert.match(feed, /&lt;footer&gt;&lt;a href=/)
  assert.match(feed, /<item><title>Dotfiles<\/title>/)
  assert.match(
    feed,
    /<item><title>HTTP handlers<\/title>[\s\S]*?<pubDate>Thu, 22 Dec 2022 00:00:00 GMT<\/pubDate>/,
  )
  assert.doesNotMatch(feed, /Fixture|_drafts/)
  assert.doesNotMatch(
    feed,
    /__ASTRO_IMAGE_|callout--quote|data-code|&lt;script/,
  )
  assert.doesNotMatch(feed, /srcset=&quot;&quot;/)
  assert.doesNotMatch(feed, /(?:href|src)=&quot;\//)

  const urls = [
    ...feed.matchAll(/<link>(https:\/\/dans\.land\/garden\/[^<]+)<\/link>/g),
  ]
    .map((match) => match[1])
    .sort()
  assert.deepEqual(urls, (await publishedGardenUrls()).sort())
})

test("robots.txt points to the generated sitemap index", async () => {
  const robots = await readFile("dist/robots.txt", "utf8")
  assert.match(robots, /Sitemap: https:\/\/dans\.land\/sitemap-index\.xml/)
})

function element(node: HtmlNode, predicate: (node: HtmlElement) => boolean) {
  return elements(node, predicate)[0]
}

function elements(
  node: HtmlNode,
  predicate: (node: HtmlElement) => boolean,
  matches: HtmlElement[] = [],
): HtmlElement[] {
  if ("tagName" in node && predicate(node)) {
    matches.push(node)
  }

  if ("childNodes" in node) {
    for (const child of node.childNodes) {
      elements(child, predicate, matches)
    }
  }

  return matches
}

function attribute(node: HtmlElement | undefined, name: string) {
  return node?.attrs?.find((entry) => entry.name === name)?.value
}

function textContent(node: HtmlNode | undefined): string {
  if (!node) {
    return ""
  }

  if (node.nodeName === "#text" && "value" in node) {
    return node.value
  }

  return "childNodes" in node ? node.childNodes.map(textContent).join("") : ""
}

async function publishedGardenUrls() {
  const files = await readdir("data/garden", { recursive: true })
  const urls = await Promise.all(
    files
      .filter((file) => file.endsWith(".md"))
      .map(async (file) => {
        const source = await readFile(`data/garden/${file}`, "utf8")
        const { frontmatter } = parseFrontmatter(source)
        if (frontmatter.draft) return undefined

        const slug = canonicalizeSlug(frontmatter.slug || file)
        return `https://dans.land/garden/${slug}`
      }),
  )
  return urls.filter((url): url is string => Boolean(url))
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

async function builtPage(path: string) {
  const html = await readFile(path, "utf8")
  return { document: parse(html), html }
}

async function builtSearchIndex() {
  const { document } = await builtPage("dist/index.html")
  const dialog = element(
    document,
    (node) => attribute(node, "data-site-search") !== undefined,
  )
  const url = attribute(dialog, "data-search-index")
  assert.ok(url)
  return JSON.parse(await readFile(`dist${url}`, "utf8")) as SearchEntry[]
}

async function builtStyles(document: HtmlDocument) {
  const stylesheets = elements(
    document,
    (node) =>
      node.tagName === "link" && attribute(node, "rel") === "stylesheet",
  )
  const externalCss = await Promise.all(
    stylesheets.map(async (stylesheet) => {
      const href = attribute(stylesheet, "href")
      assert.ok(href)
      assert.match(href, /^\/assets\/.*\.css$/)
      return readFile(`dist${href}`, "utf8")
    }),
  )
  const inlineCss = elements(document, (node) => node.tagName === "style").map(
    textContent,
  )

  return [...externalCss, ...inlineCss].join("\n")
}

function metaContent(document: HtmlDocument, key: string, value: string) {
  const meta = element(document, (node) => attribute(node, key) === value)
  return attribute(meta, "content")
}

function parseSrcset(value: string | undefined) {
  assert.ok(value)
  return value.split(",").map((candidate) => {
    const match = candidate.trim().match(/^(\S+)\s+(\d+)w$/)
    assert.ok(match, `invalid srcset candidate: ${candidate}`)
    return { path: match[1], width: Number(match[2]) }
  })
}
