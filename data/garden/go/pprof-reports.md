---
title: pprof reports
description: What I learned from reading pprof reports so far.
created: 2024-11-24
updated: 2024-11-28
aliases:
  - pprof
status: seedling
---

Go provides the [pprof](https://github.com/google/pprof) tool to visualize and analyze collected pprof profiles[^1].

[^1]: A [profile](https://pkg.go.dev/runtime/pprof#Profile) is a sampled collection of stack traces. Profiles can be collected via [[Benchmarking#Profiling benchmarks|benchmarks]], by exposing [HTTP debug endpoints](https://pkg.go.dev/net/http/pprof), or [programmatically](https://pkg.go.dev/runtime/pprof#Lookup).

## Installation

```sh
go install github.com/google/pprof@latest
```

## Usage

> [!tip]
>
> When using `pprof`, the `binary` is optional, but very useful: when provided, `pprof` can show source code (e.g. when using `list`, see below).
>
> From what I understand, you don't have to provide the (test) binary when creating a profile from [[Benchmarking#Profiling benchmarks|benchmarks]]: this will happen implicitly.

### TUI

```sh
go tool pprof [binary] profiles
```

Useful commands:

- `top` shows the "top 10" nodes.
  - You can also use `topN` to list more (e.g. `top25`).
- `tree` or `tree functionName` shows a textual call graph.
  - But I often find the [Web UI](#web-ui) Graph view nicer to explore.
- `list functionName` or `weblist functionName` shows the source code.
  - And why providing the binary is useful.
- `peek functionName` shows callers and callees.
  - But I often find the [Web UI](#web-ui) Flame Graph view nicer to explore (right-click a function to see code).

### Web UI

```sh
go tool pprof -http=:3000 [binary] profiles
```

This will show the Graph view by default: a call graph where every node represents a function.

> [!tip]
>
> Not all nodes may show in the Graph view by default.
> When this happens, it's indicated by dashed arrows between nodes.
> To make them visible, either increase the node count (e.g. `-nodecount=500`), or focus on a function name (e.g. use the search box).
>
> If you want to include all data of the profile, add the `-nodefraction=0` option when running pprof or type `nodefraction=0` in the TUI.

## Memory profiles

### In-use vs alloc

- **In-use** shows the memory currently being held.
  - Visualizes the memory that's "live" on the heap.
  - Use this view when the amount of memory being used is a problem.
    - TUI: type `inuse_space` command to select (default view).
    - Web UI: select `Sample > inuse_space` (default view).
- **Alloc** shows the total memory allocations from the beginning, _including_ already freed memory.
  - Visualizes the part(s) allocating the most memory.
  - Use this view when time spent in garbage collection is a problem.
    - TUI: type `alloc_space` command to select.
    - Web UI: select `Sample > alloc_space`.

### Flat vs cum

- **Flat** shows the direct memory usage of a function, _excluding_ the memory used by its callees.
  - Visualizes how much memory a function is directly responsible for using.
  - A high flat value means the function itself is a significant contributor.
  - In the Web UI Graph view, high flat values are indicated by a large font size.
- **Cum** (cumulative) shows the memory usage of a function and all its callees.
  - Visualizes the overall impact of a function on a program's memory usage.
  - A high cumulative value means the function and its callees are a significant contributor.
  - In the Web UI Graph view, high cum values are indicated by a large red box (grey means close to zero).

## Resources

- [pprof README](https://github.com/google/pprof/blob/main/doc/README.md)
- [Profiling Go Programs](https://go.dev/blog/pprof)
- [Runtime mprof](https://go.dev/src/runtime/mprof.go)
- [Runtime pprof](https://go.dev/src/runtime/pprof/pprof.go)
