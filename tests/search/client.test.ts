import assert from "node:assert/strict"
import test from "node:test"

import {
  normalizeSearchText,
  prepareSearchIndex,
  searchEntries,
} from "../../src/search/client.ts"
import type { SearchEntry } from "../../src/search/types.ts"

const entries: SearchEntry[] = [
  {
    kind: "page",
    path: "/",
    title: "Home",
  },
  {
    content: "Measure allocations and compare benchmark results in Go.",
    description: "Practical Go benchmarking notes.",
    kind: "garden",
    path: "/garden/go/benchmarking",
    tags: ["go", "performance"],
    title: "Benchmarking",
  },
  {
    content: "How recursive DNS resolvers find authoritative nameservers.",
    description: "Notes about the domain name system.",
    kind: "garden",
    path: "/garden/computer-networks/dns",
    tags: ["networking"],
    title: "DNS",
  },
]

test("normalizes case and accents consistently", () => {
  assert.equal(normalizeSearchText("DANIËL"), "daniel")
})

test("prepares the index once and ranks every query term", () => {
  const prepared = prepareSearchIndex(entries)
  const matches = searchEntries(prepared, "GO performance")
  assert.deepEqual(matches.terms, ["go", "performance"])
  assert.equal(matches.entries.length, 1)
  assert.equal(matches.entries[0].path, "/garden/go/benchmarking")
  assert.equal(matches.entries[0].kind, "garden")
  assert.match(matches.entries[0].snippet, /allocations/)
})

test("gives exact title matches priority and respects the result limit", () => {
  const prepared = prepareSearchIndex(entries)
  const matches = searchEntries(prepared, "dns", 1)
  assert.equal(matches.entries.length, 1)
  assert.equal(matches.entries[0].title, "DNS")
  assert.ok(matches.entries[0].score >= 1_000)
})

test("matches pages by title without adding a snippet", () => {
  const prepared = prepareSearchIndex(entries)
  const matches = searchEntries(prepared, "HOME")
  assert.equal(matches.entries[0].path, "/")
  assert.equal(matches.entries[0].kind, "page")
  assert.equal("snippet" in matches.entries[0], false)
})

test("returns no ranked entries for an empty query", () => {
  const matches = searchEntries(prepareSearchIndex(entries), "  ")
  assert.deepEqual(matches, { entries: [], terms: [] })
})
