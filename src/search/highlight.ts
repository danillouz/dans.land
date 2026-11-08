import { searchMatchRanges } from "./text.ts"

export function highlightedText(
  value: string,
  terms: string[],
  owner = document,
  wordStarts = true,
) {
  const fragment = owner.createDocumentFragment()
  let offset = 0
  for (const { start, end } of searchMatchRanges(value, terms, wordStarts)) {
    fragment.append(value.slice(offset, start))
    const mark = owner.createElement("mark")
    mark.textContent = value.slice(start, end)
    fragment.append(mark)
    offset = end
  }
  fragment.append(value.slice(offset))
  return fragment
}
