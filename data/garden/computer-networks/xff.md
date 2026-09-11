---
title: XFF
description: The X-Forwarded-For header contains the IP address of a client connecting via a proxy.
created: 2024-08-18
aliases:
  - X-Forwarded-For
updated: 2026-09-10
status: seedling
---

The `X-Forwarded-For` (XFF) HTTP request header is a **de-facto standard** header that contains the IP address of a client that connects to a server via a [[Proxies|proxy server]].

When a client make a request to a server, it sends its IP address to the server.
But when a proxy sits in between, the client IP is lost because the server only sees the "final" IP address of the proxy.

> [!note]
>
> The standardized version of `X-Forwarded-For` is the `Forwarded` HTTP request header.
>
> See [developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded).

## Format

```http
X-Forwarded-For: <client>, <proxy1>, <proxy2>, ...
```

In the common append model, each proxy adds the address of the peer from which it received the request.
The first value is the original client's address, assuming the chain is well behaved.

So the rightmost XFF value is the address observed by the final proxy.
The final proxy's own address is the server's connection peer.
With just one proxy between the client and server, the header contains the client's address.

### Parsing multiple XFF headers

There can be _multiple_ XFF headers present in a request.

When this happens, the IP addresses in _all_ headers must be treated as a _single_ list:
starting with the first IP address of the first header and continuing to the last IP address of the last header.

Essentially, you must concatenate all XFF header values.

> [!warning]
>
> It is insufficient to only use one XFF header when multiple are present.

## Security

The XFF header is untrustworthy unless the request arrived through a verified trusted proxy and the proxy is configured to append or overwrite the header correctly.
Any requests that reach the origin directly must be treated as untrusted, regardless of their XFF header.
Restricting origin access to your proxies helps enforce this boundary.
Leftmost untrusted values must only be used when there's no risk of using potentially "spoofed" values.

Start with the connection peer and walk the addresses from right to left, skipping proxies in your trusted list.
Use the first untrusted address for security-related uses, like rate-limiting or blocking requests.
A trusted hop count can also work, but only when every permitted path has the expected number of proxies.

## Privacy

Because the XFF header exposes privacy-sensitive information (the IP address of a client), the user's privacy must be kept in mind when using this header.

## Resources

- [MDN: X-Forwarded-For](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For)
