import assert from "node:assert/strict"
import test from "node:test"
import {
  prepareSearchIndex,
  searchEntries,
  searchResultHref,
} from "../../src/search/client.ts"
import {
  normalizeSearchText,
  searchMatchRanges,
} from "../../src/search/text.ts"
import type { SearchEntry } from "../../src/search/types.ts"

const entries: SearchEntry[] = [
  { kind: "page", path: "/", title: "Home" },
  {
    aliases: ["Go benchmarks"],
    passages: [
      {
        text: "Measure allocations and compare benchmark results in Go.",
        id: "search-hit-1",
      },
    ],
    description: "Practical Go benchmarking notes.",
    kind: "garden",
    path: "/garden/go/benchmarking",
    sections: [{ id: "search-hit-setup", title: "Setup" }],
    tags: ["performance"],
    title: "Benchmarking",
  },
  {
    aliases: [],
    passages: [
      {
        text: "How recursive DNS resolvers find authoritative nameservers.",
        id: "search-hit-1",
      },
    ],
    description: "Notes about the domain name system.",
    kind: "garden",
    path: "/garden/computer-networks/dns",
    sections: [{ id: "search-hit-resolvers", title: "Resolvers" }],
    tags: ["networking"],
    title: "DNS",
  },
]
const benchmarkPost = entries[1] as Extract<SearchEntry, { kind: "garden" }>

test("normalizes accents and maps overlapping matches to original text", () => {
  assert.equal(normalizeSearchText("DANIËL"), "daniel")
  assert.deepEqual(searchMatchRanges("Daniël", ["daniel"]), [
    { start: 0, end: 6 },
  ])
  assert.deepEqual(searchMatchRanges("Cafe\u0301", ["cafe"]), [
    { start: 0, end: 5 },
  ])
  assert.deepEqual(searchMatchRanges("abc", ["ab", "bc"]), [
    { start: 0, end: 3 },
  ])
})

test("normalizes hyphenated spellings and apostrophe variants consistently", () => {
  assert.equal(normalizeSearchText("HTTP-handlers"), "http handlers")
  assert.equal(normalizeSearchText("SQLite CLI"), "sqlite cli")
  assert.equal(normalizeSearchText("don’t"), "don't")
  assert.equal(normalizeSearchText("net/http"), "net/http")
  assert.deepEqual(
    searchMatchRanges("HTTP-handlers", ["http", "handlers"], true),
    [
      { start: 0, end: 4 },
      { start: 5, end: 13 },
    ],
  )
  assert.deepEqual(searchMatchRanges("don’t", ["don't"], true), [
    { start: 0, end: 5 },
  ])

  const posts: SearchEntry[] = [
    {
      aliases: [],
      passages: [{ text: "HTTP handlers use net/http.", id: "http" }],
      description: "",
      kind: "garden",
      path: "/garden/http",
      sections: [],
      tags: [],
      title: "HTTP handlers",
    },
    {
      aliases: [],
      passages: [{ text: "SQLite CLI documentation.", id: "sqlite" }],
      description: "",
      kind: "garden",
      path: "/garden/sqlite",
      sections: [],
      tags: [],
      title: "SQLite CLI",
    },
  ]
  const prepared = prepareSearchIndex(posts)
  assert.equal(
    searchEntries(prepared, "http-handlers").entries[0].path,
    "/garden/http",
  )
  assert.equal(
    searchEntries(prepared, "sqlite-cli").entries[0].path,
    "/garden/sqlite",
  )
  assert.equal(searchEntries(prepared, "net/http").total, 1)
})

test("matches targeted common spellings through post aliases", () => {
  const posts: SearchEntry[] = [
    {
      aliases: ["nodejs"],
      passages: [{ text: "Node.js event loop details.", id: "node" }],
      description: "",
      kind: "garden",
      path: "/garden/nodejs-event-loop",
      sections: [],
      tags: [],
      title: "Node.js event loop",
    },
    {
      aliases: ["Mac OS"],
      passages: [{ text: "macOS setup notes.", id: "mac" }],
      description: "",
      kind: "garden",
      path: "/garden/dotfiles",
      sections: [],
      tags: [],
      title: "Dotfiles",
    },
  ]
  const prepared = prepareSearchIndex(posts)
  assert.equal(
    searchEntries(prepared, "nodejs").entries[0].path,
    "/garden/nodejs-event-loop",
  )
  assert.equal(
    searchEntries(prepared, "Mac OS").entries[0].path,
    "/garden/dotfiles",
  )
})

test("requires all query words to match one post and one visible passage", () => {
  const matches = searchEntries(prepareSearchIndex(entries), "Go performance")
  assert.deepEqual(matches.terms, ["go", "performance"])
  assert.equal(matches.total, 1)
  assert.equal(matches.entries[0].path, "/garden/go/benchmarking")
  assert.equal(
    searchEntries(prepareSearchIndex(entries), "go nonexistent").total,
    0,
  )

  const splitPassages: SearchEntry = {
    ...benchmarkPost,
    passages: [
      { text: "Measure allocations.", id: "a" },
      { text: "Compare benchmark results.", id: "b" },
    ],
  }
  assert.equal(
    searchEntries(prepareSearchIndex([splitPassages]), "allocations results")
      .total,
    0,
  )
})

test("returns one result per post and keeps a matching section destination", () => {
  const post = benchmarkPost
  const duplicatedPassages: SearchEntry = {
    ...post,
    passages: [
      { text: "Go performance tuning is useful.", id: "one" },
      { text: "Go performance matters.", id: "two" },
    ],
  }
  const hits = searchEntries(prepareSearchIndex([duplicatedPassages]), "go")
  assert.equal(hits.total, 1)
  assert.equal(hits.entries.length, 1)

  const sectionQualified = searchEntries(
    prepareSearchIndex([post]),
    "benchmarking setup",
  )
  assert.equal(sectionQualified.total, 1)
  const hit = sectionQualified.entries[0]
  assert.equal(hit.kind, "garden")
  assert.equal(hit.matchPath, "/garden/go/benchmarking#search-hit-setup")
  assert.equal(
    searchResultHref(hit),
    "/garden/go/benchmarking#search-hit-setup",
  )
})

test("prefers an exact word over a shorter query that is a prefix", () => {
  const posts: SearchEntry[] = [
    {
      kind: "garden",
      path: "/garden/gopher",
      title: "Gopher",
      description: "",
      aliases: [],
      tags: [],
      sections: [],
      passages: [{ text: "A gopher guide.", id: "text" }],
    },
    {
      kind: "garden",
      path: "/garden/go",
      title: "Go",
      description: "A Go guide.",
      aliases: [],
      tags: [],
      sections: [],
      passages: [{ text: "Go guide.", id: "text" }],
    },
  ]
  const [hit] = searchEntries(prepareSearchIndex(posts), "go").entries
  assert.equal(hit.title, "Go")
  assert.equal(searchResultHref(hit), "/garden/go")
})

test("does not match words inside longer words, including before Unicode letters", () => {
  const post: SearchEntry = {
    kind: "garden",
    path: "/garden/words",
    title: "Words",
    description: "",
    aliases: [],
    tags: [],
    sections: [],
    passages: [
      {
        text: "Élan and algorithm; ñgo and 𐐀go are not word starts.",
        id: "text",
      },
    ],
  }
  const prepared = prepareSearchIndex([post])
  assert.equal(searchEntries(prepared, "elan").total, 1)
  assert.equal(searchEntries(prepared, "go").total, 0)
  assert.equal(searchEntries(prepared, "main").total, 0)
})

test("matches pages by title and leaves their links unchanged", () => {
  const hits = searchEntries(prepareSearchIndex(entries), "HOME")
  assert.equal(hits.entries[0].kind, "page")
  assert.equal(searchResultHref(hits.entries[0]), "/")
})

test("returns no ranked entries for an empty query", () => {
  assert.deepEqual(searchEntries(prepareSearchIndex(entries), "  "), {
    entries: [],
    terms: [],
    total: 0,
  })
})
