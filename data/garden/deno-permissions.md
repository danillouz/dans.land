---
title: Deno permissions
description: Deno's permissions model can fail GitHub Actions jobs when creating job summaries.
created: 2024-11-09
updated: 2026-09-12
status: evergreen
---

> [!note] TL;DR
>
> - To create a GitHub Actions job summary from a Deno script, the script must run with `--allow-env`, `--allow-read`, `--allow-sys` and `--allow-write` permissions.
> - Use Deno `--no-prompt` to turn permission prompts into immediate errors when running interactively.

[GitHub Actions](https://github.com/features/actions) has a cool feature to create [job summaries](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/workflow-commands-for-github-actions#adding-a-job-summary).
This lets you add custom Markdown and/or HTML to a job and show it on the summary page of a workflow run (e.g. to create custom reports).

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

I was using the `@actions/core` toolkit in a [Deno](https://deno.com/) script (executed in a workflow job) to create a job summary.
But my job would always fail.

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

Creating a job summary essentially [writes to a file](https://docs.github.com/en/actions/reference/workflows-and-actions/variables#default-environment-variables).
Which becomes obvious when checking the toolkit's [write](https://github.com/actions/toolkit/blob/193fa46c20fde8b0ed54194bc08b841c78c0776d/packages/core/src/summary.ts#L117-L130) code.

But by default, Deno doesn't have access to sensitive APIs.
For example, it does not have [permission to access the file system](https://docs.deno.com/runtime/reference/permissions/#file-system-access).

The error hid the underlying cause:
the toolkit could not access the summary file without the required permissions.

## The fix

Job summaries write to a file, so the Deno script must run with `--allow-write` permission.
But interestingly this didn't fix the issue: my job would still fail with the same error.

This left me puzzled.
So after a while I just tried running the script with `--allow-all` permission, and it worked.

Turns out that the toolkit also:

- [Reads an environment variable and checks whether the summary file is readable and writable](https://github.com/actions/toolkit/blob/193fa46c20fde8b0ed54194bc08b841c78c0776d/packages/core/src/summary.ts#L62-L90).
- Uses Node compatibility APIs that access system information.

And Deno requires explicit permission to:

- [Read and write files](https://docs.deno.com/runtime/reference/permissions/#file-system-access).
- [Access environment variables](https://docs.deno.com/runtime/reference/permissions/#environment-variables).
- [Access system information](https://docs.deno.com/runtime/reference/permissions/#system-information).

So the script must be run with `--allow-env`, `--allow-read`, `--allow-sys` and `--allow-write` permissions to create a job summary.

## Improving permission errors

Debugging permission errors like described above isn't great.
Can we make the script fail (faster) with a better error?

Deno prompts for missing permissions when running interactively.
We can disable this behavior with `--no-prompt`:

> [!quote]
>
> Prompts are not shown if stdout/stderr are not a TTY, or when the `--no-prompt` flag is passed to the `deno` command.
>
> [https://docs.deno.com/runtime/fundamentals/security/#permissions](https://docs.deno.com/runtime/fundamentals/security/#permissions)

When this flag is used, it will return a clearer permission error (and fail faster).
Prompts are already disabled when stdout and stderr are not attached to a TTY, as is normally the case in GitHub Actions:

```sh
error: Uncaught (in promise) NotCapable: Requires sys access to "uid", run again with the --allow-sys flag
```

## Example run task

```json title="deno.json" {3}
{
  "tasks": {
    "run": "deno run --allow-env --allow-read --allow-sys --allow-write --no-prompt mod.ts"
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
