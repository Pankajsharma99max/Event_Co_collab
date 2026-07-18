/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Good enough for a single-instance deployment / demo. If this app is ever
 * deployed across multiple serverless instances or regions, swap this for a
 * shared store (Upstash Redis, etc.) since in-memory state doesn't sync
 * across processes.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically drop expired buckets so this Map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref?.();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { success: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { success: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  // No proxy header present. Next.js route handlers have no other way to
  // read the raw socket address, so every request without one of these
  // headers collapses into this single shared bucket — meaning IP-based
  // rate limits (login, register, verify) become one *global* limit shared
  // by every visitor, not a per-visitor one. This is fine on Vercel (which
  // always sets x-forwarded-for), but if this is ever deployed behind a
  // proxy that doesn't forward client IPs, rate limiting will effectively
  // throttle all users together — configure the proxy to set one of these
  // headers, don't rely on this fallback in production.
  return "unknown";
}
