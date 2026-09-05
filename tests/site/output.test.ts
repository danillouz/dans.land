import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { parse, type DefaultTreeAdapterMap } from "parse5"

type HtmlDocument = DefaultTreeAdapterMap["document"]
type HtmlElement = DefaultTreeAdapterMap["element"]
type HtmlNode = DefaultTreeAdapterMap["node"]

const pages = [
  {
    path: "dist/index.html",
    title: "Dan's Land",
    bodyClass: undefined,
    description:
      "Dan's Land is the personal site of Daniël Illouz: a fantasy realm of ASCII landscapes, backend engineering, immortal Gophers, and cinnamon buns.",
    canonical: "https://dans.land/",
    openGraphType: "website",
    structuredDataType: "WebSite",
  },
  {
    path: "dist/about.html",
    title: "About Daniël Illouz",
    bodyClass: "about-page",
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
    const body = element(document, (node) => node.tagName === "body")
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
    assert.equal(attribute(body, "class"), expected.bodyClass)
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
  const body = element(document, (node) => node.tagName === "body")
  const title = element(document, (node) => node.tagName === "title")

  assert.equal(attribute(body, "class"), "not-found-page")
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
  const imagePaths = [
    ...sources.map((source) => attribute(source, "srcset")),
    attribute(image, "src"),
  ]

  assert.deepEqual(
    sources.map((source) => attribute(source, "type")),
    ["image/avif", "image/webp"],
  )
  assert.equal(attribute(image, "class"), "portrait-image")
  assert.equal(attribute(image, "width"), "640")
  assert.equal(attribute(image, "height"), "800")
  assert.equal(attribute(image, "loading"), "eager")
  assert.equal(attribute(image, "decoding"), "sync")
  assert.equal(attribute(image, "fetchpriority"), "high")

  for (const imagePath of imagePaths) {
    assert.ok(imagePath)
    assert.match(imagePath, /^\/assets\/portrait\..+\.(avif|webp|png)$/)
    await readFile(`dist${imagePath}`)
  }

  assert.equal(
    JSON.parse(textContent(structuredData)).mainEntity.image,
    new URL(attribute(image, "src")!, "https://dans.land").href,
  )
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
    "ef6ca30a27f9d86779549bd1db8b5048a51f88115ed25fbcf9d4261393f77173",
  ],
  [
    "dist/index.html",
    "id",
    "map-legend",
    "d3aff0b9782aef47696e8123b442503f6217891bf056b1d40766a7108dfc6efa",
  ],
  [
    "dist/404.html",
    "class",
    "not-found-dragon",
    "e39d9ac2d2c4454b868118692ef58df6508defc2948540a2487c14d92100111f",
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
    "dist/_headers",
    "dist/_redirects",
    "dist/robots.txt",
    "dist/sitemap-index.xml",
    "dist/sitemap-0.xml",
  ]
  await Promise.all(paths.map((path) => readFile(path)))
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

  assert.match(homeCss, /#banner/)
  assert.match(homeCss, /\.ascii-art/)
  assert.match(homeCss, /\.callout/)
  assert.doesNotMatch(homeCss, /\.character-sheet/)
  assert.doesNotMatch(homeCss, /\.not-found-panel/)

  assert.match(aboutCss, /\.character-sheet/)
  assert.match(aboutCss, /\.profile-copy/)
  assert.doesNotMatch(aboutCss, /\.ascii-art/)
  assert.doesNotMatch(aboutCss, /\.not-found-panel/)

  assert.match(notFoundCss, /\.not-found-panel/)
  assert.match(notFoundCss, /\.callout/)
  assert.doesNotMatch(notFoundCss, /\.ascii-art/)
  assert.doesNotMatch(notFoundCss, /\.character-sheet/)
})

test("the homepage renders the extracted visual components", async () => {
  const { document } = await builtPage("dist/index.html")
  const asciiFigures = elements(
    document,
    (node) =>
      node.tagName === "figure" &&
      (attribute(node, "class")?.split(" ").includes("ascii-art") ?? false),
  )
  const callouts = elements(
    document,
    (node) =>
      node.tagName === "figure" &&
      (attribute(node, "class")?.split(" ").includes("callout") ?? false),
  )

  assert.equal(asciiFigures.length, 4)
  assert.equal(callouts.length, 3)
  assert.equal(
    elements(document, (node) => node.tagName === "figcaption").length,
    3,
  )
})

test("the existing redirect remains unchanged", async () => {
  const redirects = await readFile("dist/_redirects", "utf8")
  assert.equal(redirects, "/about/ /about 301\n")
})

test("the homepage preserves spaces around inline links", async () => {
  const { document } = await builtPage("dist/index.html")
  const main = element(document, (node) => node.tagName === "main")

  assert.match(
    textContent(main).replace(/\s+/g, " "),
    /legendary builders of Framer from my Fortress of Contemplation/,
  )
})

test("the generated sitemap contains every public route", async () => {
  const sitemap = await readFile("dist/sitemap-0.xml", "utf8")
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => match[1])
    .sort()

  assert.deepEqual(urls, ["https://dans.land", "https://dans.land/about"])
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

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

async function builtPage(path: string) {
  const html = await readFile(path, "utf8")
  return { document: parse(html), html }
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
