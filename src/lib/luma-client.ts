/**
 * Verifies co-host status on Luma (luma.com / lu.ma) events.
 *
 * Luma has no public API tier that a third party can call without the
 * *organizer's own* Luma Plus subscription, so instead of an API call this
 * checks Luma's public event page directly: Luma server-renders its "Hosted
 * By" section (including a link to each host's profile, e.g.
 * `/user/usr-xxxxx`) in the initial HTML — confirmed by fetching a real
 * event page and finding the host's profile id in the raw response body, no
 * JS execution required. So a plain server-side fetch + string search is
 * enough; no headless browser needed.
 *
 * The required host is identified by Luma profile id (Luma doesn't expose
 * host emails publicly), not email like the devnovate.co flow.
 */

const ALLOWED_HOSTNAMES = new Set(["luma.com", "www.luma.com", "lu.ma"]);

export class LumaVerificationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "LumaVerificationError";
  }
}

function assertSafeLumaUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new LumaVerificationError("Invalid event URL", 400);
  }
  if (url.protocol !== "https:") {
    throw new LumaVerificationError("Event URL must use https", 400);
  }
  if (!ALLOWED_HOSTNAMES.has(url.hostname.toLowerCase())) {
    throw new LumaVerificationError("URL is not a luma.com event", 400);
  }
  return url;
}

export interface LumaVerifyResult {
  listed: boolean;
  isCoHost: boolean;
}

export async function verifyLumaCoHost(
  eventUrl: string,
  requiredHostProfileId: string
): Promise<LumaVerifyResult> {
  const url = assertSafeLumaUrl(eventUrl);

  // Follow redirects manually so every hop is re-checked against the
  // allowlist — prevents an attacker-controlled redirect from steering this
  // server-side fetch at an internal/private address (SSRF).
  let current = url;
  let html: string | null = null;

  for (let hop = 0; hop < 5; hop++) {
    const res = await fetch(current.toString(), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: "text/html" },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        throw new LumaVerificationError("Redirect with no location header", 502);
      }
      current = assertSafeLumaUrl(new URL(location, current).toString());
      continue;
    }

    if (res.status === 404) {
      throw new LumaVerificationError("Event not found on Luma", 404);
    }
    if (!res.ok) {
      throw new LumaVerificationError(`Luma returned an error (${res.status})`, 502);
    }

    html = await res.text();
    break;
  }

  if (html === null) {
    throw new LumaVerificationError("Too many redirects", 502);
  }

  const isCoHost = html.includes(requiredHostProfileId);
  return { listed: true, isCoHost };
}
