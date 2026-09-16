import assert from "node:assert/strict"
import test from "node:test"
import { createMarkdownProcessor } from "@astrojs/markdown-remark"
import {
  parseMermaidSize,
  remarkMermaid,
} from "../../src/garden/remark-mermaid.ts"

test("detects Mermaid from parsed fences, including nesting and case variants", async () => {
  const processor = await createMarkdownProcessor({
    remarkPlugins: [remarkMermaid],
    syntaxHighlight: false,
  })
  for (const markdown of [
    "```mermaid width=600 height=400\ngraph TD; A-->B\n```",
    "~~~Mermaid height=400 width=600\ngraph TD; A-->B\n~~~",
    "````MERMAID width=600 height=400\ngraph TD; A-->B\n````",
    "> ```mermaid width=600 height=400\n> graph TD; A-->B\n> ```",
  ]) {
    const result = await processor.render(markdown)
    assert.equal(result.metadata.frontmatter.hasMermaid, true)
    assert.match(
      result.code,
      /<div class="mermaid-frame" data-mermaid-width="600" data-mermaid-height="400" style="--mermaid-width: 600px; --mermaid-ratio: 600 \/ 400">/,
    )
    assert.match(result.code, /<pre class="mermaid">/)
  }
  const ordinary = await processor.render("```text\nmermaid\n```\n\n`mermaid`")
  assert.equal(ordinary.metadata.frontmatter.hasMermaid, false)
  assert.doesNotMatch(ordinary.code, /class="mermaid"/)
})

test("requires Mermaid dimensions so client rendering cannot shift layout", () => {
  assert.deepEqual(parseMermaidSize("height=400 width=600"), {
    height: 400,
    width: 600,
  })
  assert.throws(
    () => parseMermaidSize(undefined),
    /require positive width and height metadata/,
  )
})

test("allows Mermaid dimensions to be calibrated during development", async () => {
  const processor = await createMarkdownProcessor({
    remarkPlugins: [[remarkMermaid, { allowMissingSize: true }]],
    syntaxHighlight: false,
  })
  const result = await processor.render("```mermaid\ngraph TD; A-->B\n```")

  assert.match(
    result.code,
    /<div class="mermaid-frame mermaid-frame--unreserved"><pre class="mermaid">/,
  )
})
