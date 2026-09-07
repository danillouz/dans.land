---
title: Deno permissions and GitHub Actions
description: Deno's permissions model can fail GitHub Actions jobs when creating job summaries.
created: 2024-11-09
status: evergreen
---

> [!note] TL;DR
>
> - To create a GitHub Actions job summary from a Deno script, the script must run with `--allow-env`, `--allow-sys` and `--allow-write` permissions.
> - Use Deno `--no-prompt` for clearer permission errors.

[GitHub Actions](https://github.com/features/actions) has a cool feature to create [job summaries](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/workflow-commands-for-github-actions#adding-a-job-summary). This allows adding custom markdown and/or html to a job, and show it on the summary page of a workflow run (e.g. to create custom reports).

## How to create a job summary

The simplest way is to write to the `$GITHUB_STEP_SUMMARY` environment variable:

```yml
steps:
  - name: Create job summary
    run: |
      echo "My report" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "This is a Markdown list:" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "- One" >> $GITHUB_STEP_SUMMARY
      echo "- Two" >> $GITHUB_STEP_SUMMARY
```

But there's also the [@actions/core](https://github.com/actions/toolkit/tree/main/packages/core#populating-job-summary) toolkit that allows doing the above in JavaScript/TypeScript:

```ts
import * as core from "@actions/core"

await core.summary
  .addHeading("My report")
  .addEOL()
  .addRaw("This is a Markdown list:")
  .addEOL()
  .addList(["One", "Two"])
  .write()
```

## The problem

I was using the `@actions/core` toolkit in a [Deno](https://deno.com/) script (executed in a workflow job) to create a job summary. But my job would always fail.

For some reason, the Promise creating the job summary would never resolve:

```sh
error: Top-level await promise never resolved
```

## The code

```ts title="mod.ts"
import * as core from "npm:@actions/core"

export async function createJobSummary<T extends Record<string, any>>(items: T[], title: string) {
  let buff = core.summary.addHeading(title).addEOL()
  if (items.length < 1) {
    buff = buff.addRaw(`No data`).addEOL()
  } else {
    const columns = Object.keys(items[0])
    const header = columns.map((col) => {
      return {
        data: col.toUpperCase(),
        header: true,
      }
    })
    const rows = items.map((item) => {
      return columns.map((col) => String(item[col]))
    })
    buff = buff.addTable([header, ...rows])
  }
  return buff.write()
}
```

## Why it fails

Creating a job summary essentially [writes to a file](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables). Which becomes obvious when checking the toolkit's [write](https://github.com/actions/toolkit/blob/main/packages/core/src/summary.ts#L124-L130) code.

But by default, Deno doesn't have access to sensitive APIs. For example, it does not have [permission to write to the file system](https://docs.deno.com/runtime/fundamentals/security/#file-system-access).

So whenever such an API is used, the default behavior is to wait until it gets permission, and why the Promise to create the job summary never resolves.

## The fix

Job summaries write to a file, so the Deno script must run with `--allow-write` permission. But interestingly this didn't fix the issue: my job would still fail with the same error.

This left me puzzled. So after a while I just tried running the script with `--allow-all` permission, and it worked.

Turns out that the toolkit also:

- [Reads environment variables](https://github.com/actions/toolkit/blob/main/packages/core/src/summary.ts#L73).
- [Interacts with the OS](https://github.com/actions/toolkit/blob/main/packages/core/src/summary.ts#L1).

And Deno requires explicit permission to:

- [Access environment variables](https://docs.deno.com/runtime/fundamentals/security/#environment-variables).
- [Access system information](https://docs.deno.com/runtime/fundamentals/security/#system-information).

So the script must be run with `--allow-env`, `--allow-sys` and `--allow-write` permissions to create a job summary.

## Improving permission errors

Debugging permission errors like described above isn't great. Can we make the script fail (faster) with a better error?

Turns out that by default Deno will prompt and wait for permission, but we can disable this behavior with `--no-prompt`:

> [!quote]
>
> Prompts are not shown if stdout/stderr are not a TTY, or when the `--no-prompt` flag is passed to the `deno` command.
>
> [https://docs.deno.com/runtime/fundamentals/security/#permissions](https://docs.deno.com/runtime/fundamentals/security/#permissions)

When this flag is used, it will return a clearer permission error (and fail faster), for example:

```sh
error: Uncaught (in promise) NotCapable: Requires sys access to "uid", run again with the --allow-sys flag
```

## Example run task

```json title="deno.json" {3}
{
  "tasks": {
    "run": "deno run --allow-env --allow-sys --allow-write --no-prompt mod.ts"
  },
  "imports": {
    "@actions/core": "npm:@actions/core@^1.11.1"
  },
  "fmt": {
    "semiColons": false
  }
}
```

## Resources

- [GitHub Actions Job Summaries](https://github.blog/news-insights/product-news/supercharging-github-actions-with-job-summaries/)
- [GitHub Actions Toolkit](https://github.com/actions/toolkit/tree/main)
- [Deno security and permissions](https://docs.deno.com/runtime/fundamentals/security/)
