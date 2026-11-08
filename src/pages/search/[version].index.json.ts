import type { APIRoute, GetStaticPaths } from "astro"

import { getSearchIndex } from "../../search/index-build"

export const prerender = true

export const getStaticPaths: GetStaticPaths = async () => {
  const index = await getSearchIndex()
  return [{ params: { version: index.version }, props: { json: index.json } }]
}

export const GET: APIRoute = ({ props }) =>
  new Response(props.json as string, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "application/json; charset=utf-8",
    },
  })
