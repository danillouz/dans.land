import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import test from "node:test"

import { parseFrontmatter } from "@astrojs/markdown-remark"
import { parse, type DefaultTreeAdapterMap } from "parse5"

import { canonicalizeSlug } from "../../src/garden/links.ts"

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
  assert.ok(attribute(image, "width"))
  assert.ok(attribute(image, "height"))
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
    "dist/_redirects",
    "dist/robots.txt",
    "dist/rss.xml",
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

test("redirects legacy paths to their canonical routes", async () => {
  const redirects = await readFile("dist/_redirects", "utf8")
  assert.equal(redirects, "/about/ /about 301\n")
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
  for (const path of [
    "dist/index.html",
    "dist/about.html",
    "dist/404.html",
    "dist/garden.html",
    "dist/garden/all.html",
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
      "https://dans.land",
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
