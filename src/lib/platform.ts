export type EventPlatform = "DEVNOVATE" | "LUMA" | "OTHER";

/**
 * Determines which co-host verification strategy applies to a submitted
 * event, based on the hostname of the event's own website URL:
 *   - devnovate.co            -> verified via devnovate-client.ts (internal API)
 *   - luma.com / lu.ma        -> verified via luma-client.ts (public page check)
 *   - anything else           -> not auto-verifiable yet; falls back to manual review
 */
export function detectPlatform(url: string): EventPlatform {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return "OTHER";
  }

  if (hostname === "devnovate.co" || hostname.endsWith(".devnovate.co")) {
    return "DEVNOVATE";
  }
  if (hostname === "luma.com" || hostname === "lu.ma" || hostname.endsWith(".lu.ma")) {
    return "LUMA";
  }
  return "OTHER";
}
