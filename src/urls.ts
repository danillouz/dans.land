export function canonicalUrl(url: URL, site?: URL) {
  if (!site) {
    throw new Error("Astro's site URL is required")
  }

  const pathname = url.pathname
    .replace(/\/index\.html$/, "/")
    .replace(/\.html$/, "")

  return new URL(pathname, site)
}
