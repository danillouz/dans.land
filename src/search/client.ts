import type { RankedSearchEntry, SearchEntry } from "./types"

interface NormalizedSearchEntry {
  content: string
  description: string
  path: string
  tags: string
  title: string
}

export interface PreparedSearchEntry {
  entry: SearchEntry
  normalized: NormalizedSearchEntry
}

export interface SearchMatches {
  entries: RankedSearchEntry[]
  terms: string[]
}

export function normalizeSearchText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function prepareSearchIndex(
  entries: SearchEntry[],
): PreparedSearchEntry[] {
  return entries.map((entry) => {
    const title = normalizeSearchText(entry.title)
    const description = normalizeSearchText(
      entry.kind === "garden" ? entry.description : "",
    )
    const path = normalizeSearchText(entry.path)
    const tags = normalizeSearchText(entry.tags?.join(" ") ?? "")
    const content = normalizeSearchText(entry.content ?? "")
    return {
      entry,
      normalized: {
        content,
        description,
        path,
        tags,
        title,
      },
    }
  })
}

export function searchEntries(
  entries: PreparedSearchEntry[],
  query: string,
  limit = 10,
): SearchMatches {
  const normalizedQuery = normalizeSearchText(query.trim())
  const terms = [...new Set(normalizedQuery.split(/\s+/).filter(Boolean))]

  if (terms.length === 0) {
    return { entries: [], terms }
  }

  const matches = entries
    .map((entry) => rank(entry, normalizedQuery, terms))
    .filter((entry): entry is RankedSearchEntry => entry !== undefined)
    .sort(
      (left, right) =>
        right.score - left.score || left.title.localeCompare(right.title),
    )
    .slice(0, limit)

  return {
    entries: matches,
    terms,
  }
}

function rank(
  prepared: PreparedSearchEntry,
  query: string,
  terms: string[],
): RankedSearchEntry | undefined {
  const { entry, normalized } = prepared
  if (
    !terms.every(
      (term) =>
        normalized.title.includes(term) ||
        (entry.kind === "garden" &&
          (normalized.description.includes(term) ||
            normalized.path.includes(term) ||
            normalized.tags.includes(term) ||
            normalized.content.includes(term))),
    )
  ) {
    return undefined
  }

  let score =
    normalized.title === query
      ? 1_000
      : normalized.title.startsWith(query)
        ? 500
        : 0

  for (const term of terms) {
    score += occurrences(normalized.title, term) * 120

    if (entry.kind === "garden") {
      score += occurrences(normalized.tags, term) * 60
      score += occurrences(normalized.path, term) * 35
      score += occurrences(normalized.description, term) * 20
      score += occurrences(normalized.content, term, 8) * 2
    }
  }

  if (entry.kind === "page") {
    return {
      ...entry,
      score,
    }
  }

  return {
    ...entry,
    score,
    snippet: excerpt(entry, normalized, terms),
  }
}

function occurrences(value: string, term: string, limit = Infinity) {
  let count = 0
  let position = value.indexOf(term)
  while (position !== -1 && count < limit) {
    count += 1
    position = value.indexOf(term, position + term.length)
  }
  return count
}

function excerpt(
  entry: Extract<SearchEntry, { kind: "garden" }>,
  normalized: NormalizedSearchEntry,
  terms: string[],
) {
  const source = entry.content || entry.description
  const normalizedSource = entry.content
    ? normalized.content
    : normalized.description
  const positions = terms
    .map((term) => normalizedSource.indexOf(term))
    .filter((position) => position >= 0)
  const match = positions.length > 0 ? Math.min(...positions) : 0
  let start = Math.max(0, match - 72)
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

  return `${start > 0 ? "…" : ""}${source.slice(start, end).trim()}${
    end < source.length ? "…" : ""
  }`
}
