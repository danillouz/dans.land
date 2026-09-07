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
    "62c98111142d5a5c5c4d22e8ee59a1e4ae1ac3293761824821f3cd2f24460272",
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
  assert.match(homeCss, /\.banner/)
  assert.doesNotMatch(homeCss, /\.character-sheet/)
  assert.doesNotMatch(homeCss, /\.not-found-panel/)

  assert.match(aboutCss, /\.character-sheet/)
  assert.match(aboutCss, /\.profile-copy/)
  assert.doesNotMatch(aboutCss, /\.ascii-art/)
  assert.doesNotMatch(aboutCss, /\.not-found-panel/)

  assert.match(notFoundCss, /\.not-found-panel/)
  assert.match(notFoundCss, /\.banner/)
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
  const banners = elements(
    document,
    (node) =>
      node.tagName === "figure" &&
      (attribute(node, "class")?.split(" ").includes("banner") ?? false),
  )

  assert.equal(asciiFigures.length, 4)
  assert.equal(banners.length, 3)
  assert.equal(
    elements(document, (node) => node.tagName === "figcaption").length,
    3,
  )
})

test("the existing redirect remains unchanged", async () => {
  const redirects = await readFile("dist/_redirects", "utf8")
  assert.equal(redirects, "/about/ /about 301\n")
})

test("the homepage points its garden links at the local garden", async () => {
  const homepage = await readFile("dist/index.html", "utf8")
  assert.equal(homepage.match(/href="\/garden"/g)?.length, 3)
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

test("Astro emits the garden content", async () => {
  const index = await readFile("dist/garden.html", "utf8")
  const gardenIndex = await readFile("dist/garden/index.html", "utf8")
  const article = await readFile("dist/garden/cache-stampeding.html", "utf8")

  assert.match(index, /Garden of Knowledge/)
  assert.match(
    index,
    /href="https:\/\/maggieappleton\.com\/garden-history"[^>]*>digital garden<\/a>/,
  )
  assert.doesNotMatch(index, /Mind the seedlings/)
  assert.match(index, /href="\/garden\/index"[^>]*>Index<\/a>/)
  assert.match(index, /href="\/garden\/cache-stampeding"/)
  assert.match(gardenIndex, /<h1[^>]*>Index<\/h1>/)
  assert.doesNotMatch(gardenIndex, /Every published post/)
  assert.doesNotMatch(gardenIndex, /Garden of Knowledge/)
  assert.match(article, /How to prevent cache stampedes\./)
})

test("every page shares the full header and footer shell", async () => {
  for (const path of [
    "dist/index.html",
    "dist/about.html",
    "dist/404.html",
    "dist/garden.html",
    "dist/garden/index.html",
    "dist/garden/cache-stampeding.html",
  ]) {
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
    assert.deepEqual(
      elements(header, (node) => node.tagName === "a").map((link) => [
        attribute(link, "href"),
        textContent(link).trim(),
      ]),
      [
        ["/", "Home"],
        ["/garden", "Garden"],
        ["/about", "About"],
      ],
    )
    assert.ok(
      element(
        footer,
        (node) => node.tagName === "a" && attribute(node, "href") === "#top",
      ),
    )
  }
})

test("garden routes only load their own styles", async () => {
  const landing = await builtPage("dist/garden.html")
  const index = await builtPage("dist/garden/index.html")
  const post = await builtPage("dist/garden/cache-stampeding.html")
  const [landingCss, indexCss, postCss] = await Promise.all([
    builtStyles(landing.document),
    builtStyles(index.document),
    builtStyles(post.document),
  ])

  assert.match(landingCss, /\.site-header/)
  assert.match(landingCss, /\.site-footer/)
  assert.doesNotMatch(landingCss, /\.banner/)
  assert.match(landingCss, /\.frame-corner/)
  assert.match(landingCss, /\.garden-intro/)
  assert.match(landingCss, /\.garden-about/)
  assert.match(landingCss, /\.recent-list/)
  assert.doesNotMatch(landingCss, /\.tree/)
  assert.doesNotMatch(landingCss, /\.post-content/)
  assert.doesNotMatch(landingCss, /\.backlinks/)

  assert.match(indexCss, /\.tree/)
  assert.doesNotMatch(indexCss, /\.garden-about/)
  assert.doesNotMatch(indexCss, /\.frame-corner/)
  assert.doesNotMatch(indexCss, /\.recent-list/)
  assert.doesNotMatch(indexCss, /\.post-content/)

  assert.match(postCss, /\.site-header/)
  assert.match(postCss, /\.site-footer/)
  assert.match(postCss, /\.post-header/)
  assert.match(postCss, /\.post-content/)
  assert.match(postCss, /\.post-image/)
  assert.match(postCss, /\.footnotes/)
  assert.match(postCss, /border-collapse:collapse/)
  assert.match(postCss, /\.backlinks/)
  assert.doesNotMatch(postCss, /\.garden-intro/)
  assert.doesNotMatch(postCss, /\.tree/)
  assert.doesNotMatch(postCss, /\.recent-list/)
})

test("the generated sitemap contains every public route", async () => {
  const sitemap = await readFile("dist/sitemap-0.xml", "utf8")
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => match[1])
    .sort()

  assert.deepEqual(urls, [
    "https://dans.land",
    "https://dans.land/about",
    "https://dans.land/garden",
    "https://dans.land/garden/cache-stampeding",
    "https://dans.land/garden/computer-networks/caddy-local-ca",
    "https://dans.land/garden/computer-networks/dns",
    "https://dans.land/garden/computer-networks/example-com",
    "https://dans.land/garden/computer-networks/nagles-algorithm",
    "https://dans.land/garden/computer-networks/proxies",
    "https://dans.land/garden/computer-networks/xff",
    "https://dans.land/garden/deno-gh-actions",
    "https://dans.land/garden/dotfiles",
    "https://dans.land/garden/go/benchmarking",
    "https://dans.land/garden/go/building-proxies",
    "https://dans.land/garden/go/comments",
    "https://dans.land/garden/go/http-handlers",
    "https://dans.land/garden/go/pgo",
    "https://dans.land/garden/go/pprof-reports",
    "https://dans.land/garden/go/s3-high-memory",
    "https://dans.land/garden/go/zip-bombs",
    "https://dans.land/garden/index",
    "https://dans.land/garden/lambda/audio-transcoding",
    "https://dans.land/garden/lambda/nodejs-event-loop",
    "https://dans.land/garden/lambda/serverless-auth",
    "https://dans.land/garden/low-latency-high-availability",
    "https://dans.land/garden/mastadon-alias",
    "https://dans.land/garden/obsidian-clipper",
    "https://dans.land/garden/sqlite-cli",
    "https://dans.land/garden/ssh-sign-commits",
  ])
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
