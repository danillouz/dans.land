import assert from "node:assert/strict"
import test from "node:test"

import { prepareSearchContent } from "../../src/search/index-content.ts"

test("indexes visible prose, assigns stable destinations, and keeps sections", () => {
  const input = [
    '<h2 id="networking">Networking</h2>',
    '<p>Use <abbr title="Domain Name System">DNS</abbr> with a diagram.</p>',
    "<ul><li>Outer list text <p>Nested paragraph text</p> tail.</li></ul>",
    "<script>secretScript()</script><style>.secret { color: red }</style>",
    '<div class="mermaid">secretDiagram()</div>',
  ].join("")

  const result = prepareSearchContent(input)
  assert.deepEqual(result.passages, [
    { text: "Use DNS with a diagram.", id: "search-hit-1" },
    { text: "Outer list text tail.", id: "search-hit-2" },
    { text: "Nested paragraph text", id: "search-hit-3" },
  ])
  assert.deepEqual(result.sections, [
    { id: "search-hit-networking", title: "Networking" },
  ])
  assert.match(
    result.html,
    /<h2 id="networking"><span id="search-hit-networking" data-search-hit-anchor="" aria-hidden="true"><\/span>Networking<\/h2>/,
  )
  assert.match(result.html, /<p id="search-hit-1" data-search-hit="">/)
  assert.doesNotMatch(
    result.passages.map((passage) => passage.text).join(" "),
    /secretScript|secretDiagram|color: red/,
  )
})

test("drops image alt text and attribute-only search content", () => {
  const result = prepareSearchContent(
    '<img alt="resolver diagram"><p title="private metadata">Visible text</p><div title="hidden attribute term"></div>',
  )
  assert.deepEqual(result.passages, [
    { text: "Visible text", id: "search-hit-1" },
  ])
  assert.deepEqual(result.sections, [])
})

test("treats line breaks as word separators in indexed passages", () => {
  const result = prepareSearchContent("<p>DNS<br>record lookup</p>")
  assert.deepEqual(result.passages, [
    { text: "DNS record lookup", id: "search-hit-1" },
  ])
})

test("preserves Astro's image placeholder only on img elements", () => {
  const result = prepareSearchContent(
    '<img __astro_image_="image marker"><div __astro_image_="ordinary authored attribute">Text</div>',
  )
  assert.match(result.html, /<img __ASTRO_IMAGE_="image marker">/)
  assert.match(
    result.html,
    /<div __astro_image_="ordinary authored attribute">/,
  )
})

test("indexes a visible caption even when it is hidden from screen readers", () => {
  const result = prepareSearchContent(
    '<figure><img alt="diagram details"><figcaption aria-hidden="true">Call stack frames</figcaption></figure>',
  )
  assert.deepEqual(result.passages, [
    { text: "Call stack frames", id: "search-hit-1" },
  ])
})

test("skips code examples while retaining their surrounding section", () => {
  const input = [
    '<h2 id="examples">Examples</h2>',
    '<div class="expressive-code"><figure><pre data-language="ts"><code><div class="ec-line"><span class="code">const answer = 42</span></div></code></pre></figure></div>',
    '<p id="authored">A paragraph.</p>',
  ].join("")

  const result = prepareSearchContent(input)
  assert.deepEqual(result.sections, [
    { id: "search-hit-examples", title: "Examples" },
  ])
  assert.deepEqual(result.passages, [{ text: "A paragraph.", id: "authored" }])
  assert.match(result.html, /class="expressive-code"/)
  assert.match(result.html, /<p id="authored" data-search-hit="">/)
})

test("avoids collisions between authored, heading, and passage IDs", () => {
  const result = prepareSearchContent(
    '<div id="search-hit-1"></div><h2 id="2">Section</h2><p>First text.</p>',
  )

  assert.deepEqual(result.sections, [{ id: "search-hit-2", title: "Section" }])
  assert.deepEqual(
    result.passages.map(({ id }) => id),
    ["search-hit-3"],
  )
  assert.match(result.html, /<p id="search-hit-3" data-search-hit="">/)
})

test("does not index content inside hidden subtrees", () => {
  const result = prepareSearchContent(
    '<figure aria-hidden="true"><img alt="hidden diagram"></figure><p hidden>hidden prose</p><p>visible prose</p>',
  )

  assert.deepEqual(result.passages, [
    { text: "visible prose", id: "search-hit-1" },
  ])
})

test("is idempotent and safely serializes authored attributes", () => {
  const first = prepareSearchContent(
    '<h2 id="setup"><a href="#setup">Setup</a></h2><div id="search-hit-setup"></div><p id="quote&quot;mark" title="a&amp;b">Safe text</p>',
  )
  const second = prepareSearchContent(first.html)

  assert.equal(second.html, first.html)
  assert.deepEqual(second.sections, [
    { id: "search-hit-setup-2", title: "Setup" },
  ])
  assert.deepEqual(second.passages, [{ text: "Safe text", id: 'quote"mark' }])
  assert.match(second.html, /title="a&amp;b"/)
  assert.match(second.html, /data-search-hit=""/)
})
