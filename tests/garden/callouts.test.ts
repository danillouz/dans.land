import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"
import test from "node:test"

import { remarkCallouts } from "../../src/garden/remark-callouts.ts"

interface TestNode {
  children?: TestNode[]
  data?: Record<string, unknown>
  type: string
  url?: string
  value?: string
}

function tree(children: TestNode[]): TestNode {
  return { type: "root", children }
}

function calloutIcon(value: string): TestNode {
  return {
    type: "emphasis",
    data: {
      hName: "span",
      hProperties: {
        ariaHidden: "true",
        className: ["callout-icon"],
      },
    },
    children: [{ type: "text", value }],
  }
}

test("published content only uses the four supported callout types", async () => {
  const files = await readdir("data/garden", { recursive: true })
  const supported = new Set(["note", "tip", "warning", "quote"])

  for (const file of files.filter(
    (file) => file.endsWith(".md") && !file.startsWith("_drafts/"),
  )) {
    const source = await readFile(`data/garden/${file}`, "utf8")
    let inCodeFence = false

    for (const line of source.split("\n")) {
      if (/^\s*```/.test(line)) {
        inCodeFence = !inCodeFence
        continue
      }

      const type = !inCodeFence && line.match(/^> \[!([^\]]+)\]/)?.[1]
      if (type) {
        assert.ok(supported.has(type.toLowerCase()), `${file}: ${type}`)
      }
    }

    assert.doesNotMatch(source, /<\/?blockquote>/)
  }
})

test("marks callouts and preserves inline title markup and body", () => {
  const blockquote: TestNode = {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [
          { type: "text", value: "[!warning] " },
          {
            type: "strong",
            children: [
              { type: "text", value: "Mind the " },
              {
                type: "emphasis",
                children: [{ type: "text", value: "gap" }],
              },
            ],
          },
        ],
      },
      {
        type: "paragraph",
        children: [{ type: "text", value: "Keep the body." }],
      },
    ],
  }

  remarkCallouts()(tree([blockquote]))

  assert.deepEqual(blockquote.data, {
    hProperties: {
      className: ["callout", "callout--warning"],
      dataCallout: "warning",
    },
  })
  assert.deepEqual(blockquote.children?.[0], {
    type: "paragraph",
    data: { hProperties: { className: ["callout-title"] } },
    children: [
      calloutIcon("!"),
      {
        type: "strong",
        children: [
          { type: "text", value: "Mind the " },
          {
            type: "emphasis",
            children: [{ type: "text", value: "gap" }],
          },
        ],
      },
    ],
  })
  assert.equal(blockquote.children?.[1]?.children?.[0]?.value, "Keep the body.")
})

test("matches callout types case-insensitively", () => {
  const blockquote: TestNode = {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", value: "[!NOTE]" }],
      },
      {
        type: "paragraph",
        children: [{ type: "text", value: "A short summary." }],
      },
    ],
  }

  remarkCallouts()(tree([blockquote]))

  assert.deepEqual(blockquote.children?.[0]?.children?.[0], calloutIcon("※"))
  assert.equal(blockquote.children?.[0]?.children?.[1]?.value, "Note")
  assert.deepEqual(blockquote.data, {
    hProperties: {
      className: ["callout", "callout--note"],
      dataCallout: "note",
    },
  })
  assert.equal(
    blockquote.children?.[1]?.children?.[0]?.value,
    "A short summary.",
  )
})

test("separates a callout body without a blank quoted line", () => {
  const blockquote: TestNode = {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", value: "[!tip]\nA useful shortcut." }],
      },
    ],
  }

  remarkCallouts()(tree([blockquote]))

  assert.deepEqual(blockquote.children?.[0]?.children?.[0], calloutIcon("✦"))
  assert.equal(blockquote.children?.[0]?.children?.[1]?.value, "Tip")
  assert.equal(
    blockquote.children?.[1]?.children?.[0]?.value,
    "A useful shortcut.",
  )
})

test("renders sourced quotes with semantic citation markup", () => {
  const sourceLink: TestNode = {
    type: "link",
    url: "https://example.com/source",
    children: [{ type: "text", value: "https://example.com/source" }],
  }
  const blockquote: TestNode = {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", value: "[!quote]" }],
      },
      {
        type: "paragraph",
        children: [{ type: "text", value: "A quotation." }],
      },
      {
        type: "paragraph",
        children: [sourceLink],
      },
    ],
  }

  remarkCallouts()(tree([blockquote]))

  assert.deepEqual(blockquote.data, {
    hName: "figure",
    hProperties: {
      className: ["callout", "callout--quote"],
      dataCallout: "quote",
    },
  })
  assert.deepEqual(blockquote.children?.[0], calloutIcon("“"))
  assert.deepEqual(blockquote.children?.[1], {
    type: "blockquote",
    data: { hProperties: { cite: "https://example.com/source" } },
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", value: "A quotation." }],
      },
    ],
  })
  assert.deepEqual(blockquote.children?.[2], {
    type: "paragraph",
    data: {
      hName: "figcaption",
      hProperties: { className: ["callout-citation"] },
    },
    children: [
      {
        type: "emphasis",
        data: { hName: "cite" },
        children: [sourceLink],
      },
    ],
  })
})

test("renders unsourced quotes without an empty citation", () => {
  const blockquote: TestNode = {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", value: "[!QUOTE]\nA quotation." }],
      },
    ],
  }

  remarkCallouts()(tree([blockquote]))

  assert.equal(blockquote.data?.hName, "figure")
  assert.deepEqual(blockquote.children, [
    calloutIcon("“"),
    {
      type: "blockquote",
      children: [
        {
          type: "paragraph",
          children: [{ type: "text", value: "A quotation." }],
        },
      ],
    },
  ])
})

test("leaves unsupported callout types unchanged", () => {
  const blockquote: TestNode = {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", value: "[!info]\nSome context." }],
      },
    ],
  }
  const before = structuredClone(blockquote)

  remarkCallouts()(tree([blockquote]))

  assert.deepEqual(blockquote, before)
})

test("leaves ordinary blockquotes unchanged", () => {
  const blockquote: TestNode = {
    type: "blockquote",
    children: [
      {
        type: "paragraph",
        children: [{ type: "text", value: "A regular quotation." }],
      },
    ],
  }
  const before = structuredClone(blockquote)

  remarkCallouts()(tree([blockquote]))

  assert.deepEqual(blockquote, before)
})
