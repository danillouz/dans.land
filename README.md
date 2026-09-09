# dans.land

Welcome to Dan's Land, my personal site.

## Garden publishing contract

- Posts live in `data/garden/` and require `title`, `description`, and `created` frontmatter.
- Optional fields: `updated`, `status`, `tags`, `aliases`, `slug`, and `draft`. Drafts are not published.
- Use wikilinks such as `[[DNS]]` or `[[DNS#Why do we need DNS?]]` for backlinks; unresolved links fail the build. Aliases do not create redirects.
- Supported callouts: `note`, `tip`, `warning`, and `quote`.
- Images use Astro's responsive pipeline. Mermaid loads near the viewport; RSS retains diagram source.

## Build commands

Requires Node.js `>=22.12.0`. After running `npm i`, run:

- `npm start` to start the local development server.
- `npm run build` to build the site for deployment.
- `npm run preview` to preview built site.
- `npm run check` to run Astro and TypeScript diagnostics.
- `npm test` to run checks, build the site, and run the test suite.

## ASCII art

Taken/adapted from [ASCII Art Archive](https://www.asciiart.eu/).
