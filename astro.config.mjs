import { defineConfig } from "astro/config"
import { fileURLToPath } from "node:url"

import { rehypeHeadingIds, unified } from "@astrojs/markdown-remark"
import sitemap from "@astrojs/sitemap"
import remarkWikiLink from "@flowershow/remark-wiki-link"
import expressiveCode from "astro-expressive-code"
import rehypeAutolinkHeadings from "rehype-autolink-headings"

import { rehypeImageFigures } from "./src/garden/rehype-image-figures.ts"
import { remarkCallouts } from "./src/garden/remark-callouts.ts"
import { remarkMermaid } from "./src/garden/remark-mermaid.ts"
import { remarkGardenLinks } from "./src/garden/remark-wikilinks.ts"
import { remarkReadingTime } from "./src/garden/remark-reading-time.ts"

const gardenRoot = fileURLToPath(new URL("./data/garden", import.meta.url))

// See: https://docs.astro.build/en/guides/configuring-astro/
export default defineConfig({
  site: "https://dans.land",
  trailingSlash: "never",
  image: {
    layout: "constrained",
    breakpoints: [320, 480, 672, 960, 1344],
  },
  integrations: [
    expressiveCode(),
    sitemap({
      filter: (page) => page !== "https://dans.land/404",
    }),
  ],
  markdown: {
    processor: unified({
      // Keep the generated "Footnotes" heading visible.
      remarkRehype: { footnoteLabelProperties: {} },
      remarkPlugins: [
        remarkWikiLink,
        [remarkGardenLinks, { gardenRoot }],
        remarkCallouts,
        remarkMermaid,
        remarkReadingTime,
      ],
      rehypePlugins: [
        rehypeHeadingIds,
        rehypeImageFigures,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: { className: ["heading-link"] },
            test: ["h2", "h3", "h4", "h5", "h6"],
          },
        ],
      ],
    }),
  },
  build: {
    assets: "assets",
    format: "file",
  },
})
