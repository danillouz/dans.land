---
title: example.com
description: Domains reserved by the Internet Assigned Numbers Authority (IANA).
created: 2023-06-09
updated: 2026-09-13
status: evergreen
---

The domains [reserved by IANA](https://www.iana.org/domains/reserved) include a few that are meant for documentation and examples.
One of them is [example.com](https://example.com/).
These domains can't be registered or transferred.

These example domains also appear in IANA's [Special-Use Domain Names registry](https://www.iana.org/assignments/special-use-domain-names/special-use-domain-names.xhtml).
This is a broader registry of names whose special handling is defined by IETF standards.

## Special TLDs

The most notable special-use [[DNS#Top-level domains and subdomains|TLDs]] are:

- `.test`
- `.example`
- `.invalid`
- `.localhost`

## How to use special domains?

[RFC 2606](https://datatracker.ietf.org/doc/rfc2606/) specifies best practices on how to use the special domains.
It recommends the following:

- **.test** domains are recommended for testing DNS-related code.
- **.example** domains are recommended for documentation and examples.
- **.invalid** domains are recommended for demonstrating invalid domain names.
- **.localhost** domains are reserved for loopback addresses to the local host (so local networks don't break).

> [!note]
>
> There's also [RFC 6761](https://datatracker.ietf.org/doc/rfc6761/) with more information, like how DNS servers should handle these domains.

## Why are special domains useful?

**Special-use domains prevent tests and documentation from unexpectedly referring to a name that someone registered.**

Their exact behavior depends on the name.
For example, `.invalid` should return a negative DNS response, `.localhost` should resolve to loopback addresses, and `.test` may behave differently depending on the network's configuration.

Let's say I make up a domain for (local) testing, where I expect certain behavior (e.g. it must resolve, or it must fail).
It could happen that at some point the domain becomes available, gets registered, and now my test will behave unexpectedly.

This is what happened with the `.dev` TLD!
It was sometimes used for local testing before Google Registry [became its operator](https://blog.google/innovation-and-ai/technology/developers-tools/hello-dev/) through ICANN's new gTLD program and launched it publicly.
