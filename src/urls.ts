export function normalizePagePathname(pathname: string) {
  return pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "")
}

export function canonicalUrl(url: URL, site?: URL) {
  if (!site) {
    throw new Error("Astro's site URL is required")
  }

  return new URL(normalizePagePathname(url.pathname), site)
}
