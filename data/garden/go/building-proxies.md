---
title: Building proxies
description: What I learned so far (and some musings) about building proxies in Go.
created: 2024-08-23
updated: 2026-09-12
status: seedling
---

It's pretty easy to start building a [[Proxies|proxy]] in Go.
The simplest example to create a (reverse) proxy looks something like:

```go
proxy := httputil.NewSingleHostReverseProxy(targetURL)
```

But one thing that's not obvious to me yet, is the best way to work with upstreams (i.e. targets to proxy to) that are not known beforehand.

For example, Caddy has support for [dynamic upstreams](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#dynamic-upstreams).
But it looks like you do need to know them beforehand?

So I'm not sure yet what the "best practice approach" is to proxy to a different target for different requests (e.g. performance wise).
But I guess it depends on the exact use-case(s).

I did learn that you can use `httputil.ReverseProxy` and `Rewrite` to do something more custom per request:

```go
func NewProxy() *httputil.ReverseProxy {
	return &httputil.ReverseProxy{
		Transport: &http.Transport{
			IdleConnTimeout:     2 * time.Minute,
			MaxIdleConnsPerHost: 32,
			MaxIdleConns:        100,
		},
		Rewrite: func(pr *httputil.ProxyRequest) {
			target, ok := ValidatedTargetFromContext(pr.In.Context())
			if !ok {
				// Leave no outbound target, so the transport fails closed.
				pr.Out.URL = &url.URL{}
				return
			}
			pr.SetURL(target)
			pr.Out.Host = target.Host
		},
	}
}
```

Here `ValidatedTargetFromContext` only returns a parsed `*url.URL` after checking its scheme and host against an explicit allowlist (or other policy).
Parsing alone is not sufficient; otherwise this can become an SSRF/open-proxy endpoint.

For example, by using the request context (`ValidatedTargetFromContext`).
But this doesn't feel great (haven't explored how performance looks like when using this yet though).

Maybe it's better to implement a "non-standard" (i.e. not using `ServeHTTP`) [[HTTP handlers|handler]] and just pass extra information to it?

Something like:

```go
customProxy.ProxyHTTP(w http.ResponseWriter, r *http.Request, targetURL string)
```

> [!note]
>
> Looks like Caddy also started from `httputil.ReverseProxy`:
>
> <https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/reverseproxy.go#L756-L759>

## Resources

- [Go and Proxy Servers: Part 1 - HTTP Proxies](https://eli.thegreenplace.net/2022/go-and-proxy-servers-part-1-http-proxies/)
- [Go and Proxy Servers: Part 2 - HTTPS Proxies](https://eli.thegreenplace.net/2022/go-and-proxy-servers-part-2-https-proxies/)
- [Go and Proxy Servers: Part 3 - SOCKS proxies](https://eli.thegreenplace.net/2022/go-and-proxy-servers-part-3-socks-proxies/)
