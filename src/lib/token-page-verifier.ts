/**
 * Universal, platform-agnostic co-host verification for any event page that
 * isn't devnovate.co or Luma: proof-of-control by unique token, the same
 * mechanism used for domain/site ownership verification everywhere (Google
 * Search Console meta tags, DNS TXT records, etc.) — the organizer pastes a
 * unique, Devnovate-issued token into their event's public description, and
 * this fetches the page and checks for an exact match.
 *
 * Deliberately does NOT try to parse "hosted by" sections, since arbitrary
 * platforms have arbitrary markup — that would mean guessing, and guessing
 * is exactly what breaks "no tolerance." An exact match on a long random
 * token has no plausible false positive.
 *
 * Only handles platforms that server-render their content — this only ever
 * sees the initial HTML, no JS execution. A platform that renders its
 * description entirely client-side will report "token not found" even if
 * it's really there; that's a known, explicit limitation (see the
 * NOT_SERVER_RENDERED reason below), not a silent wrong answer.
 *
 * SSRF hardening: unlike the Luma checker (which only ever fetches
 * luma.com/lu.ma — infrastructure the organizer doesn't control DNS for),
 * this fetches an arbitrary organizer-supplied URL. A naive "resolve DNS,
 * check it's public, then fetch() by hostname" has a TOCTOU gap — DNS
 * rebinding — where a malicious DNS server returns a public IP for the check
 * and a private one moments later for the actual connection fetch() makes
 * internally. To close that, this uses Node's http/https modules directly
 * with a custom `lookup` that re-validates the resolved address at the
 * moment the socket actually connects, and reuses that same resolution for
 * every redirect hop.
 */

import { promises as dns, type LookupAddress } from "node:dns";
import net from "node:net";
import http from "node:http";
import https from "node:https";

export class TokenVerificationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "TokenVerificationError";
  }
}

const MAX_RESPONSE_BYTES = 2_000_000; // 2MB — plenty for an event description page, caps memory use
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 10_000;

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true; // malformed -> treat as unsafe
  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local fc00::/7
  const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateIPv4(v4Mapped[1]);
  return false;
}

function isPrivateIp(ip: string): boolean {
  return net.isIPv6(ip) ? isPrivateIPv6(ip) : isPrivateIPv4(ip);
}

function assertHttpUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new TokenVerificationError("Invalid event URL", 400);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new TokenVerificationError("Event URL must be http or https", 400);
  }
  return url;
}

// Custom `lookup` used by the http(s) agent: resolves DNS and rejects
// private/reserved addresses at the moment the socket is about to connect —
// not at some earlier point in time a malicious DNS server could race.
function safeLookup(
  hostname: string,
  options: { all?: boolean; family?: number },
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void
): void {
  dns
    .lookup(hostname, { all: true })
    .then((addresses) => {
      if (addresses.length === 0) {
        callback(new Error("DNS resolution returned no addresses") as NodeJS.ErrnoException, "");
        return;
      }
      const unsafe = addresses.find((a) => isPrivateIp(a.address));
      if (unsafe) {
        callback(
          new Error(`Refusing to connect: ${hostname} resolves to a private/internal address`) as NodeJS.ErrnoException,
          ""
        );
        return;
      }
      if (options.all) {
        callback(null, addresses);
      } else {
        callback(null, addresses[0]!.address, addresses[0]!.family);
      }
    })
    .catch((err) => callback(err instanceof Error ? (err as NodeJS.ErrnoException) : new Error(String(err)), ""));
}

interface RawResponse {
  status: number;
  location: string | null;
  body: string;
}

function fetchOnce(url: URL): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        headers: { Accept: "text/html", "User-Agent": "DevnovateSubmitVerifier/1.0" },
        timeout: REQUEST_TIMEOUT_MS,
        lookup: safeLookup as unknown as typeof import("node:dns").lookup,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let bytes = 0;
        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > MAX_RESPONSE_BYTES) {
            res.destroy();
            reject(new TokenVerificationError("Event page response was too large", 502));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            location: res.headers.location ?? null,
            body: Buffer.concat(chunks).toString("utf-8"),
          });
        });
        res.on("error", reject);
      }
    );
    req.on("timeout", () => req.destroy(new Error("Request timed out")));
    req.on("error", (err) => {
      reject(
        err.message.includes("Refusing to connect") || err.message.includes("private")
          ? new TokenVerificationError("Event URL resolves to a private/internal address", 400)
          : new TokenVerificationError(`Could not reach the event page (${err.message})`, 502)
      );
    });
    req.end();
  });
}

export interface TokenVerifyResult {
  found: boolean;
  reason?: "NOT_SERVER_RENDERED";
}

export async function verifyTokenOnPage(eventUrl: string, token: string): Promise<TokenVerifyResult> {
  let current = assertHttpUrl(eventUrl);
  let html: string | null = null;

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    const res = await fetchOnce(current);

    if (res.status >= 300 && res.status < 400) {
      if (!res.location) throw new TokenVerificationError("Redirect with no location header", 502);
      current = assertHttpUrl(new URL(res.location, current).toString());
      continue;
    }
    if (res.status === 404) {
      throw new TokenVerificationError("Event page not found", 404);
    }
    if (res.status < 200 || res.status >= 300) {
      throw new TokenVerificationError(`Event page returned an error (${res.status})`, 502);
    }

    html = res.body;
    break;
  }

  if (html === null) {
    throw new TokenVerificationError("Too many redirects", 502);
  }

  const found = html.includes(token);
  if (!found && html.length < 2000 && /<div id="(root|app|__next)"/.test(html)) {
    // Heuristic: tiny HTML payload with just an app-mount div strongly
    // suggests a client-rendered SPA shell — the real content (and the
    // token, if present) never made it into what we fetched.
    return { found: false, reason: "NOT_SERVER_RENDERED" };
  }
  return { found };
}
