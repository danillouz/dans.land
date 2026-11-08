import type { RankedSearchEntry, SearchEntry } from "./types"
import {
  normalizeSearchText,
  searchMatchRanges,
  searchTermPositions,
} from "./text.ts"

interface NormalizedSearchEntry {
  title: string
  aliases: string[]
  tags: string[]
  description: string
  sections: string[]
  passages: string[]
}

export interface PreparedSearchEntry {
  entry: SearchEntry
  normalized: NormalizedSearchEntry
}

export interface SearchMatches {
  entries: RankedSearchEntry[]
  terms: string[]
  total: number
}

export function prepareSearchIndex(
  entries: SearchEntry[],
): PreparedSearchEntry[] {
  return entries.map((entry) => ({
    entry,
    normalized: {
      title: normalizeSearchText(entry.title),
      aliases:
        entry.kind === "garden" ? entry.aliases.map(normalizeSearchText) : [],
      tags: entry.kind === "garden" ? entry.tags.map(normalizeSearchText) : [],
      description: normalizeSearchText(
        entry.kind === "garden" ? entry.description : "",
      ),
      sections:
        entry.kind === "garden"
          ? entry.sections.map((section) => normalizeSearchText(section.title))
          : [],
      passages:
        entry.kind === "garden"
          ? entry.passages.map((passage) => normalizeSearchText(passage.text))
          : [],
    },
  }))
}

export function searchEntries(
  entries: PreparedSearchEntry[],
  query: string,
  limit = 10,
): SearchMatches {
  const normalizedQuery = normalizeSearchText(query).trim().replace(/\s+/g, " ")
  const terms = [...new Set(normalizedQuery.split(" ").filter(Boolean))]
  if (!terms.length) {
    return {
      entries: [],
      terms,
      total: 0,
    }
  }

  const matches = entries
    .map((entry) => rank(entry, normalizedQuery, terms))
    .filter((entry): entry is RankedSearchEntry => entry !== undefined)
    .sort(
      (left, right) =>
        right.score - left.score || left.title.localeCompare(right.title),
    )

  return {
    entries: matches.slice(0, Math.max(0, limit)),
    terms,
    total: matches.length,
  }
}

function contains(value: string, term: string) {
  return searchTermPositions(value, term, true, 1).length > 0
}

function covers(value: string, terms: string[]) {
  return terms.every((term) => contains(value, term))
}

function rank(
  prepared: PreparedSearchEntry,
  query: string,
  terms: string[],
): RankedSearchEntry | undefined {
  const { entry, normalized } = prepared
  if (entry.kind === "page") {
    if (!covers(normalized.title, terms)) {
      return undefined
    }
    return {
      ...entry,
      score:
        normalized.title === query
          ? 1_600
          : query.length >= 3 && normalized.title.startsWith(query)
            ? 900
            : 500,
    }
  }

  const metadata = [
    normalized.title,
    ...normalized.aliases,
    ...normalized.tags,
    normalized.description,
  ]
  const metadataCovers = terms.map((term) =>
    metadata.some((value) => contains(value, term)),
  )
  let best: RankedSearchEntry | undefined

  if (metadataCovers.every(Boolean)) {
    const titleCovers = covers(normalized.title, terms)
    const descriptionCovers = covers(normalized.description, terms)
    const aliasCovers = normalized.aliases.some((alias) => covers(alias, terms))
    const tagCovers = normalized.tags.some((tag) => covers(tag, terms))
    const score = titleCovers
      ? normalized.title === query
        ? 1_600
        : query.length >= 3 && normalized.title.startsWith(query)
          ? 900
          : 800
      : aliasCovers
        ? 750
        : tagCovers
          ? 700
          : descriptionCovers
            ? 600
            : 350

    best = {
      ...entry,
      score,
      snippet: entry.description,
      matchPath:
        !titleCovers && descriptionCovers
          ? `${entry.path}#post-description`
          : undefined,
    }
  }

  // Query terms may be qualified by post metadata, but body terms must meet
  // within one visible passage. Unrelated paragraphs never form a hit.
  for (const [index, section] of entry.sections.entries()) {
    const value = normalized.sections[index]
    const localCount = terms.filter((term) => contains(value, term)).length
    if (
      !localCount ||
      !terms.every(
        (term, termIndex) => metadataCovers[termIndex] || contains(value, term),
      )
    ) {
      continue
    }

    const score =
      350 +
      localCount * 120 +
      (value === query
        ? 700
        : query.length >= 3 && value.startsWith(query)
          ? 250
          : 0)
    if (!best || score > best.score) {
      best = {
        ...entry,
        score,
        snippet: entry.description,
        matchPath: `${entry.path}#${section.id}`,
        sectionTitle: section.title,
      }
    }
  }

  for (const [index, passage] of entry.passages.entries()) {
    const value = normalized.passages[index]
    const localCount = terms.filter((term) => contains(value, term)).length
    if (
      !localCount ||
      !terms.every(
        (term, termIndex) => metadataCovers[termIndex] || contains(value, term),
      )
    ) {
      continue
    }

    const score =
      180 +
      localCount * 60 +
      (localCount === terms.length ? 80 : 0) +
      (value.includes(query) ? 40 : 0)
    if (!best || score > best.score) {
      best = {
        ...entry,
        score,
        snippet: textExcerpt(passage.text, terms),
        matchPath: `${entry.path}#${passage.id}`,
      }
    }
  }

  return best
}

/** Keep search destinations as plain deep links to their matching passage. */
export function searchResultHref(entry: RankedSearchEntry) {
  if (entry.kind === "page") {
    return entry.path
  }

  return entry.matchPath ?? entry.path
}

function textExcerpt(source: string, terms: string[]) {
  const match = searchMatchRanges(source, terms, true)[0]?.start ?? 0
  let start = Math.max(0, match - 40)
  let end = Math.min(source.length, start + 190)

  if (start > 0) {
    const nextSpace = source.indexOf(" ", start)
    if (nextSpace !== -1 && nextSpace < match) {
      start = nextSpace + 1
    }
  }

  if (end < source.length) {
    const previousSpace = source.lastIndexOf(" ", end)
    if (previousSpace > start) {
      end = previousSpace
    }
  }

  return `${start > 0 ? "…" : ""}${source.slice(start, end).trim()}${end < source.length ? "…" : ""}`
}
