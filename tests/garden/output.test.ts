import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import test from "node:test"

import { parseFrontmatter } from "@astrojs/markdown-remark"

test("renders the folder tree as the compact all-posts view", async () => {
  const all = await readFile("dist/garden/all.html", "utf8")
  assert.match(all, /<h1 class="sr-only"[^>]*>All garden posts<\/h1>/)
  assert.match(all, /class="all-tree"/)
  assert.match(all, /<strong[^>]*>Garden<\/strong>/)
  assert.match(all, /class="folder"[^>]*>computer networks<\/strong>/)
  assert.match(all, /href="\/garden\/computer-networks\/dns"[^>]*>DNS<\/a>/)
  assert.match(all, /class="folder"[^>]*>go<\/strong>/)
})

test("renders the public wikilink star map on the all-posts page", async () => {
  const page = await readFile("dist/garden/all.html", "utf8")
  const payload = page.match(
    /<script type="application\/json" data-graph-data>(.*?)<\/script>/,
  )?.[1]

  assert.match(page, /class="garden-graph"[^>]*data-garden-graph/)
  assert.match(page, /Graph\.astro_astro_type_script/)
  assert.match(page, /aria-label="Garden constellations"/)
  assert.match(page, /<svg[^>]*height="600"/)
  assert.ok(page.indexOf('class="banner"') < page.indexOf("data-garden-graph"))
  assert.match(page, /data-graph-zoom="0\.75"/)
  assert.match(page, /data-graph-reset/)
  assert.match(page, /data-graph-zoom="1\.25"/)
  assert.doesNotMatch(page, /data-graph-caption/)
  assert.ok(payload)

  const graph = JSON.parse(payload)
  assert.ok(graph.nodes.length > 0)
  assert.ok(graph.edges.length > 0)
  assert.deepEqual(
    graph.edges.find(
      (edge: { source: string; target: string }) =>
        edge.source === "go/building-proxies" &&
        edge.target === "go/http-handlers",
    ),
    { source: "go/building-proxies", target: "go/http-handlers" },
  )
  assert.ok(
    graph.nodes.some(
      (node: { href: string; title: string }) =>
        node.href === "/garden/go/http-handlers" &&
        node.title === "HTTP handlers",
    ),
  )
  assert.ok(
    graph.nodes.every(
      (node: { id: string }) => !node.id.startsWith("_drafts/"),
    ),
  )
})

test("renders recently tended posts in date order", async () => {
  const landing = await readFile("dist/garden.html", "utf8")
  const recentStart = landing.indexOf('id="recent-posts"')
  const recent = landing.slice(
    recentStart,
    landing.indexOf("</section>", recentStart),
  )

  assert.ok(
    landing.indexOf('id="recent-posts"') <
      landing.indexOf('class="garden-about garden-prose"'),
  )
  assert.match(landing, /href="\/garden\/all"[^>]*>All<\/a>/)

  const items = [...recent.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map(
    (match) => match[1],
  )
  assert.equal(items.length, 5)

  const dates = items.map((item) => {
    assert.match(item, /<a href="\/garden\/[^"]+"[^>]*>[^<]+<\/a>/)
    const time = item.match(
      /<time datetime="(\d{4}-\d{2}-\d{2})"[^>]*>([^<]+)<\/time>/,
    )
    assert.ok(time)

    const date = new Date(`${time[1]}T00:00:00Z`)
    assert.equal(
      time[2],
      new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
        year: "numeric",
      }).format(date),
    )
    return date.getTime()
  })

  for (let index = 1; index < dates.length; index += 1) {
    assert.ok(dates[index - 1] >= dates[index])
  }
})

test("renders canonical wikilinks instead of literal Obsidian syntax", async () => {
  const article = await readFile("dist/garden/cache-stampeding.html", "utf8")
  assert.match(
    article,
    /href="\/garden\/low-latency-high-availability#constant-work"[^>]*>constant work<\/a>/,
  )
  assert.doesNotMatch(article, /__garden_wikilink__/)
  assert.doesNotMatch(article, /\[\[/)
})

test("renders full-post previews for garden links and backlinks", async () => {
  const [article, backlinks] = await Promise.all([
    readFile("dist/garden/computer-networks/xff.html", "utf8"),
    readFile("dist/garden/computer-networks/proxies.html", "utf8"),
  ])

  assert.match(
    article,
    /href="\/garden\/computer-networks\/proxies"[^>]*data-garden-link/,
  )
  assert.match(article, /class="post-header"[^>]*data-link-preview-content/)
  assert.match(
    article,
    /class="garden-prose post-content"[^>]*data-link-preview-content/,
  )
  assert.match(article, /data-link-preview-popover/)
  assert.match(article, /data-link-preview-summary/)
  assert.match(backlinks, /class="backlinks"[\s\S]*?data-garden-link/)
})

test("links rendered headings to their URL fragments", async () => {
  const article = await readFile("dist/garden/go/comments.html", "utf8")

  assert.match(
    article,
    /<h2 id="lists"><a class="heading-link" href="#lists">Lists<\/a><\/h2>/,
  )
})

test("renders a heading rail for longer posts", async () => {
  const [article, footnoteArticle, shortArticle] = await Promise.all([
    readFile("dist/garden/go/http-handlers.html", "utf8"),
    readFile("dist/garden/lambda/nodejs-event-loop.html", "utf8"),
    readFile("dist/garden/computer-networks/caddy-local-ca.html", "utf8"),
  ])

  assert.match(article, /<nav class="toc-rail"[^>]*data-toc-rail/)
  assert.match(article, /href="#top"[^>]*data-toc-link="top"/)
  assert.match(article, /data-toc-link="handler--servemux"/)
  assert.match(article, /data-toc-link="mentioned-in"/)
  assert.match(footnoteArticle, /data-toc-link="footnote-label"/)
  assert.match(footnoteArticle, /<h2 id="footnote-label">/)
  assert.doesNotMatch(
    footnoteArticle,
    /<h2 class="sr-only" id="footnote-label">/,
  )
  assert.doesNotMatch(shortArticle, /<nav class="toc-rail"/)
})

test("renders Obsidian callouts", async () => {
  const [calloutArticle, quotedArticle, denoQuoteArticle] = await Promise.all([
    readFile("dist/garden/cache-stampeding.html", "utf8"),
    readFile("dist/garden/lambda/nodejs-event-loop.html", "utf8"),
    readFile("dist/garden/deno-gh-actions.html", "utf8"),
  ])

  assert.match(
    calloutArticle,
    /<blockquote class="callout callout--note" data-callout="note">/,
  )
  assert.match(
    calloutArticle,
    /<p class="callout-title"><span aria-hidden="true" class="callout-icon">※<\/span>Note<\/p>/,
  )
  assert.doesNotMatch(calloutArticle, /\[!note\]/i)
  assert.match(
    quotedArticle,
    /<figure class="callout callout--quote" data-callout="quote">\s*<span aria-hidden="true" class="callout-icon">“<\/span>\s*<blockquote cite="https:\/\/docs\.aws\.amazon\.com\/lambda\/latest\/dg\/running-lambda-code\.html">/,
  )
  assert.match(
    quotedArticle,
    /<figcaption class="callout-citation"><cite><a href="https:\/\/docs\.aws\.amazon\.com\/lambda\/latest\/dg\/running-lambda-code\.html">https:\/\/docs\.aws\.amazon\.com\/lambda\/latest\/dg\/running-lambda-code\.html<\/a><\/cite><\/figcaption>/,
  )
  assert.match(
    denoQuoteArticle,
    /<blockquote cite="https:\/\/docs\.deno\.com\/runtime\/fundamentals\/security\/#permissions">/,
  )
  assert.match(
    denoQuoteArticle,
    />https:\/\/docs\.deno\.com\/runtime\/fundamentals\/security\/#permissions<\/a>/,
  )
})

test("renders Mermaid diagrams only on pages that use them", async () => {
  const [diagramArticle, regularArticle] = await Promise.all([
    readFile("dist/garden/computer-networks/dns.html", "utf8"),
    readFile("dist/garden/go/http-handlers.html", "utf8"),
  ])

  assert.match(diagramArticle, /<pre class="mermaid">/)
  assert.match(diagramArticle, /accTitle: Domain name hierarchy/)
  assert.match(diagramArticle, /Mermaid\.astro/)
  assert.doesNotMatch(diagramArticle, /data-language="mermaid"/)
  assert.doesNotMatch(regularArticle, /Mermaid\.astro/)
})

test("renders backlinks from the shared content index", async () => {
  const [article, articleWithFootnotes, comments, audioTranscoding] =
    await Promise.all([
      readFile("dist/garden/low-latency-high-availability.html", "utf8"),
      readFile("dist/garden/go/http-handlers.html", "utf8"),
      readFile("dist/garden/go/comments.html", "utf8"),
      readFile("dist/garden/lambda/audio-transcoding.html", "utf8"),
    ])
  assert.match(
    article,
    /<h2 id="mentioned-in"[^>]*><a class="heading-link" href="#mentioned-in"[^>]*>Mentioned in<\/a><\/h2>/,
  )
  assert.match(
    article,
    /href="\/garden\/cache-stampeding"[^>]*>Cache stampeding<\/a>/,
  )
  assert.match(
    article,
    /rel="canonical" href="https:\/\/dans\.land\/garden\/low-latency-high-availability"/,
  )
  assert.doesNotMatch(article, /Part of/)
  assert.match(
    articleWithFootnotes,
    /class="backlinks backlinks--after-footnotes"/,
  )
  assert.doesNotMatch(comments, /<section class="backlinks"/)
  assert.doesNotMatch(audioTranscoding, /<section class="backlinks"/)
  assert.match(comments, /class="wikilink" href="#lists"/)
})

test("renders accessible, annotated Rosé Pine code blocks", async () => {
  const [article, highlighted, diff, benchmarking, assetNames] =
    await Promise.all([
      readFile("dist/garden/go/http-handlers.html", "utf8"),
      readFile("dist/garden/go/s3-high-memory.html", "utf8"),
      readFile("dist/garden/lambda/nodejs-event-loop.html", "utf8"),
      readFile("dist/garden/go/benchmarking.html", "utf8"),
      readdir("dist/assets"),
    ])
  const expressiveCodeStylesheet = assetNames.find((name) =>
    /^ec\..+\.css$/.test(name),
  )
  const gardenStylesheet = assetNames.find((name) =>
    /^Garden\..+\.css$/.test(name),
  )

  assert.match(
    article,
    /<h3 id="servemux"><a class="heading-link" href="#servemux">/,
  )
  assert.match(article, /class="post-description"/)
  assert.match(article, /class="expressive-code"/)
  assert.match(
    article,
    /<figcaption class="header"><span class="title">main\.go/,
  )
  assert.match(article, /class="ln" aria-hidden="true">1<\/div>/)
  assert.match(article, /<button title="Copy to clipboard"/)
  assert.match(article, /--0:#286983;--1:#3E8FB0/)
  assert.match(article, /--0:#9E5F5D;--1:#EA9A97/)
  assert.match(highlighted, /class="ec-line highlight mark"/)
  assert.match(diff, /class="ec-line highlight (?:del|ins)"/)
  assert.match(
    benchmarking,
    /<style>\s*\.expressive-code \.copy button \{\s*opacity: 0;/,
  )
  assert.ok(expressiveCodeStylesheet)
  assert.ok(gardenStylesheet)

  const gardenStyles = await readFile(`dist/assets/${gardenStylesheet}`, "utf8")
  assert.match(gardenStyles, /\.frame:has\(pre:focus-visible\)/)

  const styles = await readFile(
    `dist/assets/${expressiveCodeStylesheet}`,
    "utf8",
  )
  assert.match(styles, /--ec-codeBg:#faf4ed/)
  assert.match(styles, /--ec-codeBg:#232136/)
  assert.match(styles, /--ec-gtrBrdWd:0px/)
  assert.match(styles, /--ec-tm-markBg:#f2e9e1/)
  assert.match(styles, /--ec-tm-markBg:#393552/)
  assert.match(styles, /--ec-tm-markBrdCol:#d7827e/)
  assert.match(styles, /--ec-tm-markBrdCol:#ea9a97/)
  assert.match(styles, /--ec-tm-insBg:#56949f33/)
  assert.match(styles, /--ec-tm-insBg:#9ccfd833/)
  assert.match(styles, /--ec-tm-delBg:#b4637a33/)
  assert.match(styles, /--ec-tm-delBg:#eb6f9233/)
  assert.match(styles, /--ec-tm-lineMarkerAccentWd:3px/)
})

test("renders post context, dates, and reading time", async () => {
  const [article, articleWithoutUpdate] = await Promise.all([
    readFile("dist/garden/go/http-handlers.html", "utf8"),
    readFile("dist/garden/computer-networks/caddy-local-ca.html", "utf8"),
  ])
  const header = article.match(/<header class="post-header".*?<\/header>/)?.[0]
  const metadata = article.match(
    /<div class="post-meta"[^>]*>(.*?)<\/header>/,
  )?.[1]
  const metadataWithoutUpdate = articleWithoutUpdate.match(
    /<div class="post-meta"[^>]*>(.*?)<\/header>/,
  )?.[1]
  assert.ok(header)
  assert.ok(metadata)
  assert.ok(metadataWithoutUpdate)
  assert.ok(header.indexOf("<h1>") < header.indexOf("post-description"))
  assert.ok(header.indexOf("post-description") < header.indexOf("post-meta"))
  assert.match(metadata, /<span class="post-label"[^>]*>Go<\/span>/)
  assert.match(metadata, /<span class="post-label"[^>]*>Evergreen<\/span>/)
  assert.match(
    metadata,
    /<span class="post-reading-time"[^>]*>\d+ min read<\/span>/,
  )
  assert.equal(metadata.match(/post-meta-separator/g)?.length, 1)
  assertReadableDate(metadata, "Planted")
  assertReadableDate(metadata, "Last tended")
  assertReadableDate(metadataWithoutUpdate, "Planted")
  assert.doesNotMatch(metadataWithoutUpdate, /Last tended/)
})

test("renders article images as captioned figures", async () => {
  const article = await readFile(
    "dist/garden/computer-networks/caddy-local-ca.html",
    "utf8",
  )
  const stepsStart = article.indexOf("<ol>")
  assert.match(article, /<figure class="post-image">/)
  assert.match(
    article,
    /<figcaption aria-hidden="true">SEC_ERROR_UNKNOWN_ISSUER<\/figcaption>/,
  )
  assert.notEqual(stepsStart, -1)
  assert.doesNotMatch(article, /<ol start=/)
})

test("keeps image-rich instructions in continuous ordered lists", async () => {
  const [eventLoop, serverlessAuth] = await Promise.all([
    readFile("dist/garden/lambda/nodejs-event-loop.html", "utf8"),
    readFile("dist/garden/lambda/serverless-auth.html", "utf8"),
  ])
  assert.doesNotMatch(eventLoop, /<ol start=/)
  assert.doesNotMatch(serverlessAuth, /<ol start=/)
  assert.match(
    eventLoop,
    /<figcaption aria-hidden="true">State 19: the Promise callback is popped, leaving the stack and queue empty<\/figcaption>/,
  )
  assert.match(
    serverlessAuth,
    /<figcaption aria-hidden="true">Auth0 request authorization flow<\/figcaption>/,
  )
})

test("does not emit draft routes or backlinks", async () => {
  const [index, dns] = await Promise.all([
    readFile("dist/garden.html", "utf8"),
    readFile("dist/garden/computer-networks/dns.html", "utf8"),
  ])
  assert.doesNotMatch(index, /Private post/)
  assert.doesNotMatch(dns, /Private post/)
  await assert.rejects(readFile("dist/garden/_drafts/fixture.html", "utf8"))
})

test("emits every article image through Astro's asset pipeline", async () => {
  const contentFiles = await readdir("data/garden", { recursive: true })
  const expectedImageCount = (
    await Promise.all(
      contentFiles
        .filter((file) => file.endsWith(".md"))
        .map(async (file) => {
          const source = await readFile(`data/garden/${file}`, "utf8")
          const { content, frontmatter } = parseFrontmatter(source)
          return frontmatter.draft
            ? 0
            : [...content.matchAll(/!\[[^\]]*\]\([^)]+\)/g)].length
        }),
    )
  ).reduce((total, count) => total + count, 0)

  const files = await readdir("dist/garden", { recursive: true })
  const pages = await Promise.all(
    files
      .filter((file) => file.endsWith(".html"))
      .map((file) => readFile(`dist/garden/${file}`, "utf8")),
  )
  const sources = pages.flatMap((page) =>
    [...page.matchAll(/<img[^>]+src="([^"]+)"/g)].map((match) => match[1]),
  )
  assert.equal(sources.length, expectedImageCount)
  for (const page of pages) {
    for (const [image] of page.matchAll(/<img[^>]+>/g)) {
      assert.match(
        image,
        /sizes="min\(calc\(70ch - 80px\), calc\(100vw - 2.5rem - 80px\)\)"/,
      )
      const srcset = image.match(/srcset="([^"]+)"/)?.[1]
      assert.ok(srcset, "Article images need responsive candidates")
      for (const candidate of srcset.split(",")) {
        const [path, width] = candidate.trim().split(/\s+/)
        assert.match(width, /^\d+w$/)
        await readFile(`dist${path}`)
      }
    }
  }
  for (const source of sources) {
    assert.match(source, /^\/assets\/.+\.(?:avif|png|webp)$/)
    await readFile(`dist${source}`)
  }
})

function assertReadableDate(metadata: string, label: string) {
  const match = metadata.match(
    new RegExp(
      `${label}\\s*<time datetime="(\\d{4}-\\d{2}-\\d{2})"[^>]*>([^<]+)<\\/time>`,
    ),
  )
  assert.ok(match)

  const date = new Date(`${match[1]}T00:00:00Z`)
  assert.equal(
    match[2],
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(date),
  )
}
