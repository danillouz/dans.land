import { defineConfig } from "astro/config"

import sitemap from "@astrojs/sitemap"

export default defineConfig({
  site: "https://dans.land",
  trailingSlash: "never",
  integrations: [
    sitemap({
      filter: (page) => page !== "https://dans.land/404",
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        dark: "rose-pine",
        light: "rose-pine-dawn",
      },
    },
  },
  build: {
    assets: "assets",
    format: "file",
  },
})
