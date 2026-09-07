import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import test from "node:test"

import { parseFrontmatter } from "@astrojs/markdown-remark"

test("renders the folder tree on the garden index", async () => {
  const index = await readFile("dist/garden/index.html", "utf8")
  assert.match(index, /<h1[^>]*>Index<\/h1>/)
  assert.match(index, /<strong[^>]*>Garden<\/strong>/)
  assert.match(index, /class="folder"[^>]*>computer networks<\/strong>/)
  assert.match(index, /href="\/garden\/computer-networks\/dns"[^>]*>DNS<\/a>/)
  assert.match(index, /class="folder"[^>]*>go<\/strong>/)
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

test("links rendered headings to their URL fragments", async () => {
  const article = await readFile("dist/garden/go/comments.html", "utf8")

  assert.match(
    article,
    /<h2 id="lists"><a class="heading-link" href="#lists">Lists<\/a><\/h2>/,
  )
})

test("renders a heading rail for longer posts", async () => {
  const [article, shortArticle] = await Promise.all([
    readFile("dist/garden/go/http-handlers.html", "utf8"),
    readFile("dist/garden/computer-networks/caddy-local-ca.html", "utf8"),
  ])

  assert.match(article, /<nav class="toc-rail"[^>]*data-toc-rail/)
  assert.match(article, /href="#top"[^>]*data-toc-link="top"/)
  assert.match(article, /data-toc-link="handler--servemux"/)
  assert.doesNotMatch(article, /data-toc-link="footnote-label"/)
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
  const [article, comments, audioTranscoding] = await Promise.all([
    readFile("dist/garden/low-latency-high-availability.html", "utf8"),
    readFile("dist/garden/go/comments.html", "utf8"),
    readFile("dist/garden/lambda/audio-transcoding.html", "utf8"),
  ])
  assert.match(article, /id="backlinks-title"[^>]*>Backlinks<\/h2>/)
  assert.match(
    article,
    /href="\/garden\/cache-stampeding"[^>]*>Cache stampeding<\/a>/,
  )
  assert.match(
    article,
    /rel="canonical" href="https:\/\/dans\.land\/garden\/low-latency-high-availability"/,
  )
  assert.doesNotMatch(article, /Part of/)
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
  const metadata = article.match(/<p class="post-meta"[^>]*>(.*?)<\/p>/)?.[1]
  const metadataWithoutUpdate = articleWithoutUpdate.match(
    /<p class="post-meta"[^>]*>(.*?)<\/p>/,
  )?.[1]
  assert.ok(metadata)
  assert.ok(metadataWithoutUpdate)
  assert.match(metadata, /<span[^>]*>Go<\/span>/)
  assert.match(metadata, /<span[^>]*>Evergreen<\/span>/)
  assert.match(metadata, /<span[^>]*>\d+ min read<\/span>/)
  assert.equal(metadata.match(/post-meta-separator/g)?.length, 4)
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
