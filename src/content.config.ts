import { defineCollection } from "astro:content"
import { z } from "astro/zod"

import { gardenLoader } from "./garden/loader.ts"

const garden = defineCollection({
  loader: gardenLoader({ base: "./data/garden" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    created: z.coerce.date(),
    updated: z.coerce.date().optional(),
    status: z.enum(["seedling", "sapling", "evergreen"]).default("seedling"),
    tags: z.array(z.string()).default([]),
    aliases: z
      .union([z.string(), z.array(z.string())])
      .transform((value) => (Array.isArray(value) ? value : [value]))
      .default([]),
    slug: z.string().optional(),
    draft: z.boolean().default(false),
  }),
})

export const collections = { garden }
