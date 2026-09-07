---
title: Cache stampeding
description: How to prevent cache stampedes.
created: 2025-01-04
status: evergreen
---

A cache stores data, so that future requests for that data can be served faster and/or more efficiently.

Cached data can for example be the result of a previous (expensive) computation, or a copy of data that's stored elsewhere.

When a system using a cache comes under high (concurrent) load, a specific type of failure can happen when a cache miss occurs.

In that cache miss scenario, a lot of (concurrent) request will try to revalidate the cache at the same time. For example, by fetching data from an origin, like a database.

This can lead to congestion and/or resource issues, taking down the system, and is called a cache stampede (also known as a "cache thundering herd" or "cache dog piling").

> [!note]
>
> This is why "just adding a cache" to a slow system can be dangerous, and why highly-available and low-latency systems use techniques like [[Low-latency-high-availability-patterns#constant-work|constant work]].

## Mitigations

These are some techniques to prevent cache stampedes.

### Locking

By using a "cache lock", only 1 request will revalidate the cache, while the other requests wait (or return stale data, or a "not found").

This is for example [what Cloudflare does](https://developers.cloudflare.com/cache/concepts/revalidation/#example-2).

This approach works well in most cases. But the main downside is that it typically requires a "lock service", which adds latency (and fallibility).

### Probabilistic (early) revalidation

By using a probabilistic decision, fewer requests need to revalidate the cache at the same time: it basically rolls a die if it should revalidate the cache.

This approach does not have the downsides of using a cache lock, but needs to take [different request rates into account](https://blog.cloudflare.com/sometimes-i-cache/#optimal-cache-stampede-solution).

### External revalidation

By using "something external", the cache can be revalidated proactively. For example by pushing fresh data to the cache at the appropriate time.
