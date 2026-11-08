export interface MatchRange {
  start: number
  end: number
}

export function normalizeSearchText(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      // Treat common typographic apostrophes as the keyboard apostrophe.
      .replace(/[\u2018\u2019\u02bc\uff07]/g, "'")
      // A hyphen often separates words in titles, while users type a space.
      // Keep slashes intact for technical names such as net/http.
      .replace(/[\u002d\u2010-\u2015\u2212]/g, " ")
      .toLowerCase()
  )
}

const wordCharacter = /[\p{L}\p{N}_]/u

function precedingCharacter(value: string, position: number) {
  const last = value.charCodeAt(position - 1)
  const start =
    last >= 0xdc00 && last <= 0xdfff && position > 1
      ? position - 2
      : position - 1
  return value.slice(start, position)
}

/** Match words from their start, including partial word prefixes. */
export function searchTermPositions(
  value: string,
  term: string,
  wordStarts = true,
  limit = Infinity,
) {
  const positions: number[] = []
  if (!term) {
    return positions
  }
  let position = value.indexOf(term)
  while (position !== -1) {
    if (
      !wordStarts ||
      position === 0 ||
      !wordCharacter.test(precedingCharacter(value, position))
    ) {
      positions.push(position)
      if (positions.length >= limit) {
        break
      }
    }
    position = value.indexOf(term, position + Math.max(1, term.length))
  }
  return positions
}

/** Map accent-folded search offsets back to offsets in the original text. */
export function searchMatchRanges(
  value: string,
  terms: string[],
  wordStarts = false,
): MatchRange[] {
  const normalized = normalizeSearchText(value)
  const starts: number[] = []
  const ends: number[] = []
  let offset = 0

  for (const character of value) {
    const folded = normalizeSearchText(character)
    for (let index = 0; index < folded.length; index++) {
      starts.push(offset)
      ends.push(offset + character.length)
    }
    if (!folded && ends.length > 0) {
      ends[ends.length - 1] = offset + character.length
    }
    offset += character.length
  }

  const candidates: MatchRange[] = []
  for (const term of [...terms].sort((a, b) => b.length - a.length)) {
    if (!term) {
      continue
    }
    let position = normalized.indexOf(term)
    while (position !== -1) {
      if (
        !wordStarts ||
        position === 0 ||
        !wordCharacter.test(precedingCharacter(normalized, position))
      ) {
        candidates.push({
          start: starts[position],
          end: ends[position + term.length - 1],
        })
      }
      position = normalized.indexOf(term, position + 1)
    }
  }

  candidates.sort((a, b) => a.start - b.start || b.end - a.end)
  const ranges: MatchRange[] = []
  for (const candidate of candidates) {
    const previous = ranges.at(-1)
    if (previous && candidate.start < previous.end) {
      previous.end = Math.max(previous.end, candidate.end)
    } else {
      ranges.push(candidate)
    }
  }
  return ranges
}
