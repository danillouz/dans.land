---
title: Low latency HA
description: Low latency and HA (High Availability) patterns I learned from DynamoDB and S3.
created: 2024-12-15
updated: 2026-09-11
aliases:
  - Request hedging
  - Shuffle sharding
  - Constant work
status: seedling
---

After watching the re:Invent 2024 DynamoDB ([DAT406](https://www.youtube.com/watch?v=Qzs8mU5dgx4)) and S3 ([STG302](https://www.youtube.com/watch?v=NXehLy7IiPM)) deep dives,
I learned that DynamoDB uses an in-memory data store (MemDS) that serves their request routers.

DynamoDB is a low latency (response time < 10 MS) and highly available system, and I learned it uses [[#Request hedging]] and [[#Constant work]] as design patterns to help achieve this.
S3 also uses a pattern called [[#Shuffle sharding]] (I'm not sure if DynamoDB also uses that, but it seems likely to me).

## Request hedging

Request hedging is a design pattern to deal with tail latencies in distributed systems.
It's both used by [DynamoDB](https://youtu.be/Qzs8mU5dgx4?t=1741) and [S3](https://www.youtube.com/watch?v=NXehLy7IiPM&t=1816s).

The main idea is to make a second request, and use the fastest response.

This works when the requests take sufficiently independent paths.
If the first request is in the tail, the second request may still complete sooner.

Request hedging is a bet.
It will not always pay off.
But in practice, it's very effective.
This pattern was invented at [Google (Dean and Barroso)](https://www.barroso.org/publications/TheTailAtScale.pdf).

> [!note]
>
> The second request can start immediately or after a delay.
> Hedging adds work and load, so only use it for operations that are safe to duplicate, and cancel the slower request when possible.

## Shuffle sharding

Shuffle sharding is a design pattern [used by S3](https://www.youtube.com/watch?v=NXehLy7IiPM&t=1254s) to allocate workloads across subsets of resources with limited overlap.
This isolates contention and "hot" workloads, by keeping their blast radius bounded.

Shuffle sharding can make request hedging more effective when it helps send the hedged requests through sufficiently independent paths.
It does not guarantee independence.

But shuffle sharding also helps achieve high availability:

- By spreading workloads across partially overlapping subsets, a failure is less likely to affect every possible path.
- By [isolating workloads to handle DDoS attacks](https://aws.amazon.com/builders-library/workload-isolation-using-shuffle-sharding/)

### Power of two random choices

Random allocation is okay, but has a high risk to be inefficient.
Because it essentially gives you a bell curve (normal distribution), which has an imbalanced distribution.

Instead, look [at 2 random choices and pick the better one](https://youtu.be/NXehLy7IiPM?t=2053).
This is a lot more effective.

## Constant work

DynamoDB uses a design pattern called [constant work](https://youtu.be/Qzs8mU5dgx4?t=1826) to make sure a (part of a) system always runs in the same "steady state".
This prevents potentially overloading the system, and helps make it highly available.

This is especially important for systems that use (in-memory) caches.

DynamoDB's request routers have their own in-memory cache, but even for cache hits,
they send request(s) to their storage (MemDS),
so that when they lose the in-memory cache in the router for whatever reason,
the storage "doesn't notice".
