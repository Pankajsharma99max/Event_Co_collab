import { NextResponse, type NextRequest } from "next/server";

// Runs for every request. Two jobs:
//   1. Attach hardened security headers to every response.
//   2. Reject cross-origin state-changing requests (defense-in-depth CSRF
//      guard) that don't carry a same-origin Origin header — Auth.js already
//      does its own CSRF check for /api/auth/*, this covers our own API routes.

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(req: NextRequest) {
  if (STATE_CHANGING_METHODS.has(req.method) && req.nextUrl.pathname.startsWith("/api/")) {
    const origin = req.headers.get("origin");
    if (origin) {
      const originHost = safeHost(origin);
      const requestHost = req.nextUrl.host;
      if (originHost !== requestHost) {
        return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
      }
    }
  }

  const res = NextResponse.next();
  applySecurityHeaders(res);
  return res;
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function applySecurityHeaders(res: NextResponse) {
  // Next.js dev mode (HMR/React Refresh) needs eval + inline scripts; keep
  // production locked down to 'self' only.
  const isDev = process.env.NODE_ENV !== "production";
  res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self'${isDev ? " 'unsafe-eval' 'unsafe-inline'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      `connect-src 'self'${isDev ? " ws:" : ""}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  res.headers.set("X-DNS-Prefetch-Control", "off");
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
