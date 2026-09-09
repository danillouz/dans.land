import assert from "node:assert/strict"
import test from "node:test"
import { createMarkdownProcessor } from "@astrojs/markdown-remark"
import { remarkMermaid } from "../../src/garden/remark-mermaid.ts"

test("detects Mermaid from parsed fences, including nesting and case variants", async () => {
  const processor = await createMarkdownProcessor({
    remarkPlugins: [remarkMermaid],
    syntaxHighlight: false,
  })
  for (const markdown of [
    "```mermaid\ngraph TD; A-->B\n```",
    "~~~Mermaid\ngraph TD; A-->B\n~~~",
    "````MERMAID\ngraph TD; A-->B\n````",
    "> ```mermaid\n> graph TD; A-->B\n> ```",
  ]) {
    const result = await processor.render(markdown)
    assert.equal(result.metadata.frontmatter.hasMermaid, true)
    assert.match(result.code, /<pre class="mermaid">/)
  }
  const ordinary = await processor.render("```text\nmermaid\n```\n\n`mermaid`")
  assert.equal(ordinary.metadata.frontmatter.hasMermaid, false)
  assert.doesNotMatch(ordinary.code, /class="mermaid"/)
})
