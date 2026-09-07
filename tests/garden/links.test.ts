import assert from "node:assert/strict"
import test from "node:test"

import { createMarkdownProcessor } from "@astrojs/markdown-remark"
import remarkWikiLink from "@flowershow/remark-wiki-link"

import {
  assertValidGardenIndex,
  canonicalizeSlug,
  createGardenResolver,
  finalizeGardenGraph,
  parseWikiLink,
  resolveWikiLink,
} from "../../src/garden/links.ts"
import type {
  GardenData,
  GardenEntry,
  WikiLinkReference,
} from "../../src/garden/links.ts"
import { remarkGardenLinks } from "../../src/garden/remark-wikilinks.ts"

interface EntryOptions {
  headings?: Array<{ depth: number; slug: string; text: string }>
  references?: WikiLinkReference[]
  rendered?: boolean
}

function entry(
  id: string,
  data: GardenData,
  { headings = [], references = [], rendered = true }: EntryOptions = {},
): GardenEntry {
  return {
    data: { aliases: [], draft: false, ...data },
    id,
    rendered: rendered
      ? {
          html: references
            .map(
              (_, index) => `<a href="/__garden_wikilink__/${index}">link</a>`,
            )
            .join(" "),
          metadata: { frontmatter: { gardenLinks: references }, headings },
        }
      : undefined,
  }
}

test("indexes canonical slugs, titles, and aliases", () => {
  const resolver = createGardenResolver([
    entry("concepts/linking-posts", {
      aliases: ["connections"],
      title: "Linking posts",
    }),
  ])
  assert.equal(
    canonicalizeSlug("Concepts/Linking Posts.md"),
    "concepts/linking-posts",
  )
  assert.equal(canonicalizeSlug("Concepts/Index.md"), "concepts")
  assert.equal(
    resolveWikiLink(resolver, "Linking posts", "source").post?.slug,
    "concepts/linking-posts",
  )
  assert.equal(
    resolveWikiLink(resolver, "connections", "source").post?.slug,
    "concepts/linking-posts",
  )
  assert.equal(
    resolveWikiLink(resolver, "Linking-posts", "source").post?.slug,
    "concepts/linking-posts",
  )
})

test("parses labels and fragments without inventing heading IDs", () => {
  const parsed = parseWikiLink("[[connections#Résumé|how links connect]]")
  assert.deepEqual(parsed, {
    fragment: "Résumé",
    label: "how links connect",
    raw: "[[connections#Résumé|how links connect]]",
    target: "connections",
  })
})

test("uses rendered headings and derives unique outgoing links and backlinks", () => {
  const references = [
    parseWikiLink("[[connections]]"),
    parseWikiLink("[[Linking posts#Résumé]]"),
  ]
  const entries = [
    entry("welcome", { title: "Welcome" }, { references }),
    entry(
      "concepts/linking-posts",
      { aliases: ["connections"], title: "Linking posts" },
      { headings: [{ depth: 2, slug: "résumé", text: "Résumé" }] },
    ),
  ]
  const index = assertValidGardenIndex(finalizeGardenGraph(entries))
  assert.deepEqual(index.bySlug.get("welcome")?.outgoingLinks, [
    {
      href: "/garden/concepts/linking-posts",
      slug: "concepts/linking-posts",
      title: "Linking posts",
    },
  ])
  assert.deepEqual(index.bySlug.get("concepts/linking-posts")?.backlinks, [
    { href: "/garden/welcome", slug: "welcome", title: "Welcome" },
  ])
  assert.match(entries[0]?.rendered?.html ?? "", /#résumé/)
})

test("keeps same-post wikilinks out of the backlink graph", () => {
  const references = [parseWikiLink("[[#Details]]")]
  const entries = [
    entry(
      "welcome",
      { title: "Welcome" },
      {
        headings: [{ depth: 2, slug: "details", text: "Details" }],
        references,
      },
    ),
  ]
  const index = assertValidGardenIndex(finalizeGardenGraph(entries))
  const post = index.bySlug.get("welcome")

  assert.deepEqual(post?.outgoingLinks, [])
  assert.deepEqual(post?.backlinks, [])
  assert.match(entries[0]?.rendered?.html ?? "", /href="#details"/)
})

test("drafts do not validate links or create backlinks", () => {
  const entries = [
    entry("published", { title: "Published" }),
    entry(
      "draft",
      { draft: true, title: "Draft" },
      { references: [parseWikiLink("[[Missing]]")], rendered: false },
    ),
  ]
  const index = assertValidGardenIndex(finalizeGardenGraph(entries))
  assert.equal(index.bySlug.has("draft"), false)
  assert.deepEqual(index.bySlug.get("published")?.backlinks, [])
})

test("a published link to a draft is broken", () => {
  const index = finalizeGardenGraph([
    entry(
      "published",
      { title: "Published" },
      { references: [parseWikiLink("[[Draft]]")] },
    ),
    entry("draft", { draft: true, title: "Draft" }, { rendered: false }),
  ])
  assert.throws(
    () => assertValidGardenIndex(index),
    /published: cannot resolve \[\[Draft\]\]/,
  )
})

test("reports missing headings using the actual rendered heading list", () => {
  const index = finalizeGardenGraph([
    entry(
      "welcome",
      { title: "Welcome" },
      { references: [parseWikiLink("[[Target#Missing]]")] },
    ),
    entry("target", { title: "Target" }),
  ])
  assert.throws(
    () => assertValidGardenIndex(index),
    /cannot find heading "Missing" in target/,
  )
})

test("reports ambiguous wikilinks with every candidate", () => {
  const index = finalizeGardenGraph([
    entry(
      "welcome",
      { title: "Welcome" },
      { references: [parseWikiLink("[[shared]]")] },
    ),
    entry("alpha", { aliases: ["shared"], title: "Alpha" }),
    entry("beta", { aliases: ["shared"], title: "Beta" }),
  ])
  assert.throws(
    () => assertValidGardenIndex(index),
    /welcome: \[\[shared\]\] matches alpha, beta/,
  )
})

test("the Markdown parser only collects syntactic wikilinks", async () => {
  const processor = await createMarkdownProcessor({
    remarkPlugins: [remarkWikiLink, remarkGardenLinks],
    syntaxHighlight: false,
  })
  const markdown = [
    "Visible [[Target]].",
    "",
    String.raw`\[[Escaped missing]]`,
    "",
    "<!-- [[Comment missing]] -->",
    "",
    "[outer [[Hidden target]]](https://example.com)",
    "",
    "`[[Inline code]]`",
  ].join("\n")
  const result = await processor.render(markdown, {
    fileURL: new URL("../../data/garden/parser-fixture.md", import.meta.url),
  })
  assert.deepEqual(result.metadata.frontmatter.gardenLinks, [
    parseWikiLink("[[Target]]"),
  ])
  assert.match(result.code, /href="\/__garden_wikilink__\/0"/)
  assert.match(result.code, /\[\[Escaped missing\]\]/)
  assert.match(
    result.code,
    /<a href="https:\/\/example\.com">outer \[\[Hidden target\]\]<\/a>/,
  )
  assert.doesNotMatch(result.code, /__garden_wikilink__\/1/)
})
