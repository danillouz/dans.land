interface SearchEntryMetadata {
  path: string
  title: string
}

export type SearchEntry = SearchEntryMetadata &
  (
    | {
        content: string
        description: string
        kind: "garden"
        tags: string[]
      }
    | {
        content?: never
        kind: "page"
        tags?: never
      }
  )

export type RankedSearchEntry =
  | (Extract<SearchEntry, { kind: "garden" }> & {
      score: number
      snippet: string
    })
  | (Extract<SearchEntry, { kind: "page" }> & {
      score: number
    })
