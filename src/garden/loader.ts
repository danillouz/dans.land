/**
 * Loads all garden posts as one graph-aware transaction.
 *
 * Astro's glob loader processes files independently and has no collection
 * post-pass. Resolving aliases, wikilinks and heading fragments—and deriving
 * backlinks and graph data—requires every published post to be rendered first.
 * This loader validates and stores that finalized graph, then repeats the whole
 * transaction after Markdown changes so derived links cannot become stale.
 */

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { parseFrontmatter } from "@astrojs/markdown-remark"
import type { Loader, LoaderContext } from "astro/loaders"

import {
  assertValidGardenIndex,
  canonicalizeSlug,
  finalizeGardenGraph,
} from "./links.ts"
import type { GardenData, GardenEntry } from "./links.ts"

interface StagedGardenEntry extends GardenEntry {
  absolutePath: string
  body: string
  digest: string
  filePath: string
}

async function markdownFiles(root: string) {
  const files: string[] = []

  async function visit(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue
      }

      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await visit(absolutePath)
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(absolutePath)
      }
    }
  }

  await visit(root)
  return files.sort()
}

async function stageEntries(
  context: LoaderContext,
  base: string,
): Promise<StagedGardenEntry[]> {
  const files = await markdownFiles(base)
  return Promise.all(
    files.map(async (absolutePath) => {
      const source = await readFile(absolutePath, "utf8")
      const { content: body, frontmatter } = parseFrontmatter(source)
      const sourcePath = path
        .relative(base, absolutePath)
        .replaceAll(path.sep, "/")
      const id = canonicalizeSlug(frontmatter.slug || sourcePath)
      const data = await context.parseData<GardenData>({
        data: frontmatter as GardenData,
        filePath: absolutePath,
        id,
      })

      return {
        absolutePath,
        body,
        data,
        digest: context.generateDigest(source),
        filePath: path
          .relative(fileURLToPath(context.config.root), absolutePath)
          .replaceAll(path.sep, "/"),
        id,
      }
    }),
  )
}

async function renderPublishedEntries(
  context: LoaderContext,
  entries: StagedGardenEntry[],
) {
  await Promise.all(
    entries
      .filter((entry) => !entry.data.draft)
      .map(async (entry) => {
        entry.rendered = await context.renderMarkdown(entry.body, {
          fileURL: pathToFileURL(entry.absolutePath),
        })
      }),
  )
}

function assertUniqueIds(entries: StagedGardenEntry[]) {
  const ids = new Map<string, string>()
  for (const entry of entries) {
    const existing = ids.get(entry.id)
    if (existing) {
      throw new Error(
        `Duplicate garden slug "${entry.id}" in ${existing} and ${entry.filePath}.`,
      )
    }

    ids.set(entry.id, entry.filePath)
  }
}

async function synchronize(context: LoaderContext, base: string) {
  const entries = await stageEntries(context, base)
  assertUniqueIds(entries)
  await renderPublishedEntries(context, entries)
  assertValidGardenIndex(finalizeGardenGraph(entries))

  context.store.clear()
  for (const entry of entries) {
    context.store.set({
      assetImports: entry.rendered?.metadata?.imagePaths,
      body: entry.body,
      data: entry.data,
      digest: entry.digest,
      filePath: entry.filePath,
      id: entry.id,
      rendered: entry.rendered,
    })
  }
}

function watchesMarkdown(base: string, changedPath: string) {
  const relative = path.relative(base, changedPath)
  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative) &&
    changedPath.endsWith(".md")
  )
}

export function gardenLoader({
  base = "./data/garden",
}: { base?: string } = {}): Loader {
  let watching = false
  let pending = Promise.resolve()
  return {
    name: "dans-land-garden",
    async load(context) {
      const root = path.resolve(fileURLToPath(context.config.root), base)
      await synchronize(context, root)

      if (!context.watcher || watching) {
        return
      }

      watching = true
      context.watcher.add(root)

      const refresh = (changedPath: string) => {
        if (!watchesMarkdown(root, changedPath)) {
          return
        }

        pending = pending
          .then(() => synchronize(context, root))
          .catch((error: unknown) =>
            context.logger.error(
              error instanceof Error ? error.message : String(error),
            ),
          )
      }

      context.watcher.on("add", refresh)
      context.watcher.on("change", refresh)
      context.watcher.on("unlink", refresh)
    },
  }
}
