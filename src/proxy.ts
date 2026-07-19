import { NextResponse, type NextRequest } from "next/server";

// Runs for every matched request. Two jobs:
//   1. Reject cross-origin state-changing requests (defense-in-depth CSRF
//      guard) for our own /api routes.
//   2. Attach hardened security headers, including a nonce-based Content
//      Security Policy.
//
// Why a nonce (not `script-src 'self'`): Next.js App Router hydrates the page
// with INLINE bootstrap/streaming scripts (`self.__next_f.push(...)`). A bare
// `script-src 'self'` blocks those inline scripts, so the page renders but
// never becomes interactive — every button (Google login included) goes dead.
// The nonce lets exactly Next's own scripts run while still blocking injected
// inline scripts. `'strict-dynamic'` then trusts the chunk scripts those load.
// Per Next.js docs, the CSP must be set on the REQUEST headers too, so Next
// reads the nonce during SSR and stamps it onto every script tag it emits.

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(req: NextRequest) {
  // --- 1. Cross-origin CSRF guard for our own API routes ---
  if (STATE_CHANGING_METHODS.has(req.method) && req.nextUrl.pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    if (origin) {
      const originHost = safeHost(origin);
      // Behind a reverse proxy (Render, Vercel, nginx, the /submit-event
      // integration, …) the server's own `nextUrl.host` is the INTERNAL host,
      // not the public domain the browser sent in `Origin` — so comparing
      // against nextUrl.host alone rejects every same-origin POST in prod.
      // Accept the origin if it matches ANY plausible representation of the
      // real host: the proxy-forwarded host, the Host header, or nextUrl.host.
      // Safe: a browser can't set a custom Host/X-Forwarded-Host on a
      // cross-site request (both are forbidden headers), and the trusted edge
      // proxy sets x-forwarded-host to the real public domain — so an
      // attacker's Origin can never appear among these candidates.
      const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
      const allowedHosts = new Set(
        [forwardedHost, req.headers.get("host"), req.nextUrl.host].filter(Boolean)
      );
      if (!originHost || !allowedHosts.has(originHost)) {
        return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
      }
    }
  }

  // --- 2. Nonce-based CSP + security headers ---
  const isDev = process.env.NODE_ENV !== "production";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' makes modern browsers trust scripts loaded by the
    // nonce'd bootstrap and ignore the host allowlist for scripts. 'unsafe-eval'
    // is only needed in dev (React uses eval for better error stacks).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Inline styles (React style props, Next's injected styles) are low-risk;
    // nonce-ing them tends to break Tailwind/React, so allow 'unsafe-inline'.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  // Next.js reads the nonce from the CSP on the REQUEST headers during SSR.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-DNS-Prefetch-Control", "off");
  return res;
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
