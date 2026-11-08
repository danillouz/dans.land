export interface SearchSection {
  id: string
  title: string
}

export interface SearchPassage {
  id: string
  text: string
}

export type SearchEntry =
  | {
      kind: "page"
      path: string
      title: string
    }
  | {
      kind: "garden"
      path: string
      title: string
      description: string
      aliases: string[]
      tags: string[]
      sections: SearchSection[]
      passages: SearchPassage[]
    }

export type RankedSearchEntry =
  | (Extract<SearchEntry, { kind: "page" }> & { score: number })
  | (Extract<SearchEntry, { kind: "garden" }> & {
      score: number
      snippet: string
      matchPath?: string
      sectionTitle?: string
    })
