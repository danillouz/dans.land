/**
 * Resolves and validates links across the rendered collection, then derives the
 * backlink graph that Astro's per-entry Markdown rendering does not provide.
 *
 * Targets resolve through canonical paths, post titles, or frontmatter aliases.
 * The build fails on broken, ambiguous, or missing-heading links. Drafts are
 * excluded from validation, routes, and the public graph. Resolved links produce
 * the backlink data shown on destination posts.
 */

export interface GardenData extends Record<string, unknown> {
  aliases?: string | string[]
  draft?: boolean
  title: string
}

export interface WikiLinkReference {
  fragment: string | null
  label: string | null
  raw: string
  target: string
}

export interface GardenLink {
  href: string
  slug: string
  title: string
}

export interface GardenGraph {
  backlinks: GardenLink[]
  outgoingLinks: GardenLink[]
}

interface GardenHeading {
  depth: number
  slug: string
  text: string
}

interface GardenRenderedContent {
  html: string
  metadata?: {
    frontmatter?: Record<string, unknown>
    headings?: GardenHeading[]
    imagePaths?: string[]
    [key: string]: unknown
  }
}

export interface GardenEntry {
  data: GardenData
  id: string
  rendered?: GardenRenderedContent
}

type GardenIssue =
  | {
      reference: string
      sourceSlug: string
      type: "broken" | "missing-placeholder" | "missing-source"
    }
  | {
      candidates: string[]
      reference: string
      sourceSlug: string
      type: "ambiguous"
    }
  | {
      fragment: string
      reference: string
      sourceSlug: string
      targetSlug: string
      type: "missing-heading" | "unsupported-block-reference"
    }

interface GardenPost {
  aliases: string[]
  backlinks: GardenLink[]
  entry: GardenEntry
  outgoingLinks: GardenLink[]
  slug: string
  title: string
}

export interface GardenIndex {
  bySlug: Map<string, GardenPost>
  issues: GardenIssue[]
  lookup: Map<string, Set<string>>
  posts: GardenPost[]
}

type WikiLinkResolution =
  | { issue?: never; post: GardenPost; parsed: WikiLinkReference }
  | { issue: GardenIssue; post?: never; parsed?: never }

type FragmentResolution =
  | { fragment: string | null; issue?: never }
  | { fragment?: never; issue: GardenIssue }

interface GardenFrontmatter extends Record<string, unknown> {
  garden?: GardenGraph
  gardenLinks?: WikiLinkReference[]
}

function slugifySegment(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
}

export function canonicalizeSlug(value: unknown) {
  const withoutExtension = String(value)
    .replaceAll("\\", "/")
    .replace(/\.md$/i, "")
    .replace(/^\/+|\/+$/g, "")

  const slug = withoutExtension
    .split("/")
    .filter(Boolean)
    .map(slugifySegment)
    .filter(Boolean)
    .join("/")
    .replace(/\/index$/, "")

  if (!slug) {
    throw new Error(`Cannot create a garden slug from "${value}".`)
  }

  return slug
}

function normalizeLookup(value: unknown) {
  return String(value)
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim()
}

function normalizeHeading(value: unknown) {
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/\s+/g, " ")
}

function normalizeAliases(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((alias) => alias.trim())
      .filter(Boolean)
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()]
  }

  return []
}

export function parseWikiLink(
  reference: unknown,
  alias: string | null = null,
): WikiLinkReference {
  const raw = String(reference)
    .replace(/^\[\[|\]\]$/g, "")
    .trim()
  const separator = raw.indexOf("|")
  const targetWithFragment = (
    separator === -1 ? raw : raw.slice(0, separator)
  ).trim()
  const label =
    alias ?? (separator === -1 ? null : raw.slice(separator + 1).trim() || null)
  const hash = targetWithFragment.indexOf("#")
  const target = (
    hash === -1 ? targetWithFragment : targetWithFragment.slice(0, hash)
  ).trim()
  const fragment =
    hash === -1 ? null : targetWithFragment.slice(hash + 1).trim() || null

  if (!target && !fragment) {
    throw new Error(`Invalid empty wikilink "[[${raw}]]".`)
  }

  return {
    fragment,
    label,
    raw: `[[${raw}${alias ? `|${alias}` : ""}]]`,
    target,
  }
}

function registerLookup(
  lookup: Map<string, Set<string>>,
  value: unknown,
  slug: string,
) {
  const key = normalizeLookup(value)
  if (!key) {
    return
  }

  const matches = lookup.get(key) ?? new Set<string>()
  matches.add(slug)
  lookup.set(key, matches)
}

function resolveRelativeTarget(sourceSlug: string, target: string) {
  const normalizedTarget = target.replace(/\.md$/i, "").replaceAll("\\", "/")

  if (!normalizedTarget.startsWith(".")) {
    return canonicalizeSlug(normalizedTarget)
  }

  const sourceDirectory = sourceSlug.includes("/")
    ? sourceSlug.slice(0, sourceSlug.lastIndexOf("/"))
    : ""
  const resolved: string[] = []

  for (const segment of `${sourceDirectory}/${normalizedTarget}`.split("/")) {
    if (!segment || segment === ".") {
      continue
    }

    if (segment === "..") {
      resolved.pop()
    } else {
      resolved.push(segment)
    }
  }

  return canonicalizeSlug(resolved.join("/"))
}

function entryToPost(entry: GardenEntry): GardenPost {
  return {
    aliases: normalizeAliases(entry.data.aliases),
    backlinks: [],
    entry,
    outgoingLinks: [],
    slug: entry.id,
    title: String(entry.data.title),
  }
}

export function createGardenResolver(entries: GardenEntry[]): GardenIndex {
  const posts = entries
    .filter((entry) => entry.data.draft !== true)
    .map(entryToPost)
    .sort((left, right) => left.slug.localeCompare(right.slug))
  const bySlug = new Map<string, GardenPost>()
  const lookup = new Map<string, Set<string>>()

  for (const post of posts) {
    if (bySlug.has(post.slug)) {
      throw new Error(`Duplicate garden slug "${post.slug}".`)
    }

    bySlug.set(post.slug, post)
    registerLookup(lookup, post.title, post.slug)
    registerLookup(lookup, post.slug.split("/").at(-1), post.slug)
    for (const alias of post.aliases) {
      registerLookup(lookup, alias, post.slug)
    }
  }

  return {
    bySlug,
    issues: [],
    lookup,
    posts,
  }
}

export function resolveWikiLink(
  index: GardenIndex,
  reference: string | WikiLinkReference,
  sourceSlug: string,
): WikiLinkResolution {
  const parsed =
    typeof reference === "string" ? parseWikiLink(reference) : reference

  if (!parsed.target) {
    const post = index.bySlug.get(sourceSlug)
    if (!post) {
      return {
        issue: {
          reference: parsed.raw,
          sourceSlug,
          type: "missing-source",
        },
      }
    }

    return {
      post,
      parsed,
    }
  }

  const direct = index.bySlug.get(
    resolveRelativeTarget(sourceSlug, parsed.target),
  )
  if (direct) {
    return {
      post: direct,
      parsed,
    }
  }

  const candidates = [
    ...(index.lookup.get(normalizeLookup(parsed.target)) ?? []),
  ].sort()

  if (candidates.length === 1) {
    return {
      post: index.bySlug.get(candidates[0])!,
      parsed,
    }
  }

  if (candidates.length > 1) {
    return {
      issue: {
        candidates,
        reference: parsed.raw,
        sourceSlug,
        type: "ambiguous",
      },
    }
  }

  return {
    issue: {
      reference: parsed.raw,
      sourceSlug,
      type: "broken",
    },
  }
}

function resolveFragment(
  post: GardenPost,
  parsed: WikiLinkReference,
  sourceSlug: string,
): FragmentResolution {
  if (!parsed.fragment) {
    return { fragment: null }
  }

  if (parsed.fragment.startsWith("^")) {
    return {
      issue: {
        fragment: parsed.fragment,
        reference: parsed.raw,
        sourceSlug,
        targetSlug: post.slug,
        type: "unsupported-block-reference",
      },
    }
  }

  const headings = post.entry.rendered?.metadata?.headings ?? []
  const exact = headings.find((heading) => heading.slug === parsed.fragment)
  if (exact) {
    return { fragment: exact.slug }
  }

  const requested = normalizeHeading(parsed.fragment)
  const byText = headings.find(
    (heading) => normalizeHeading(heading.text) === requested,
  )
  if (byText) {
    return { fragment: byText.slug }
  }

  return {
    issue: {
      fragment: parsed.fragment,
      reference: parsed.raw,
      sourceSlug,
      targetSlug: post.slug,
      type: "missing-heading",
    },
  }
}

function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function replacePlaceholder(html: string, index: number, href: string) {
  const placeholder = `href="/__garden_wikilink__/${index}"`
  const matches = html.split(placeholder).length - 1

  if (matches !== 1) {
    return null
  }

  return html.replace(placeholder, `href="${escapeAttribute(href)}"`)
}

function renderedFrontmatter(entry: GardenEntry): GardenFrontmatter {
  if (!entry.rendered) {
    throw new Error(`Garden entry "${entry.id}" was not rendered.`)
  }

  entry.rendered.metadata ??= {}
  entry.rendered.metadata.frontmatter ??= {}
  return entry.rendered.metadata.frontmatter as GardenFrontmatter
}

export function finalizeGardenGraph(entries: GardenEntry[]) {
  const index = createGardenResolver(entries)

  for (const post of index.posts) {
    const frontmatter = renderedFrontmatter(post.entry)
    const references = frontmatter.gardenLinks ?? []
    const outgoing = new Map<string, GardenLink>()
    let html = post.entry.rendered!.html

    for (const [referenceIndex, reference] of references.entries()) {
      const result = resolveWikiLink(index, reference, post.slug)
      if (result.issue) {
        index.issues.push(result.issue)
        continue
      }

      const fragment = resolveFragment(result.post, result.parsed, post.slug)
      if (fragment.issue) {
        index.issues.push(fragment.issue)
        continue
      }

      const isSamePost = result.post.slug === post.slug
      const href =
        isSamePost && fragment.fragment
          ? `#${fragment.fragment}`
          : `/garden/${result.post.slug}${fragment.fragment ? `#${fragment.fragment}` : ""}`
      const replaced = replacePlaceholder(html, referenceIndex, href)

      if (replaced === null) {
        index.issues.push({
          reference: result.parsed.raw,
          sourceSlug: post.slug,
          type: "missing-placeholder",
        })
        continue
      }

      html = replaced
      if (!isSamePost && !outgoing.has(result.post.slug)) {
        outgoing.set(result.post.slug, {
          href: `/garden/${result.post.slug}`,
          slug: result.post.slug,
          title: result.post.title,
        })
      }
    }

    post.entry.rendered!.html = html
    post.outgoingLinks = [...outgoing.values()].sort((left, right) =>
      left.slug.localeCompare(right.slug),
    )
  }

  for (const source of index.posts) {
    for (const outgoing of source.outgoingLinks) {
      const target = index.bySlug.get(outgoing.slug)
      if (
        !target ||
        target.backlinks.some((backlink) => backlink.slug === source.slug)
      ) {
        continue
      }

      target.backlinks.push({
        href: `/garden/${source.slug}`,
        slug: source.slug,
        title: source.title,
      })
    }
  }

  for (const post of index.posts) {
    post.backlinks.sort((left, right) => left.slug.localeCompare(right.slug))
    renderedFrontmatter(post.entry).garden = {
      backlinks: post.backlinks,
      outgoingLinks: post.outgoingLinks,
    }
  }

  return index
}

export function formatGardenIssues(issues: GardenIssue[]) {
  return issues
    .map((issue) => {
      if (issue.type === "ambiguous") {
        return `- ${issue.sourceSlug}: ${issue.reference} matches ${issue.candidates.join(", ")}`
      }
      if (issue.type === "missing-heading") {
        return `- ${issue.sourceSlug}: ${issue.reference} cannot find heading "${issue.fragment}" in ${issue.targetSlug}`
      }
      if (issue.type === "unsupported-block-reference") {
        return `- ${issue.sourceSlug}: ${issue.reference} uses an unsupported block reference`
      }
      if (issue.type === "missing-placeholder") {
        return `- ${issue.sourceSlug}: could not finalize ${issue.reference}`
      }
      return `- ${issue.sourceSlug}: cannot resolve ${issue.reference}`
    })
    .join("\n")
}

export function assertValidGardenIndex(index: GardenIndex) {
  if (index.issues.length > 0) {
    throw new Error(
      `Garden link validation failed:\n${formatGardenIssues(index.issues)}`,
    )
  }

  return index
}
