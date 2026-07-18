/**
 * Verifies co-host status on devnovate.co events.
 *
 * Primary method (no backend changes needed): devnovate.co's own frontend
 * calls a PUBLIC, unauthenticated endpoint to render each event page —
 *   GET https://devnovate.co/api/v1/events/name/{eventSlug}
 * confirmed live by inspecting real network traffic against a real event.
 * Its response includes `organizers: string[]` (raw Mongo ObjectIds) and
 * `live: boolean`. So this checks that array for a specific, known,
 * fixed-format ObjectId — exact string match, same reliability tier as the
 * Luma profile-id check. Requires REQUIRED_DEVNOVATE_ORGANIZER_ID to be set
 * to the real 24-char hex ObjectId of the account that gets added as
 * co-host manager (not an email — Devnovate's public API doesn't expose
 * emails, only ObjectIds).
 *
 * Secondary method (optional, only if deployed): the external verification
 * endpoint from devnovate-api-patch/, matched by email via x-api-key. Only
 * used if DEVNOVATE_API_KEY/DEVNOVATE_API_URL are configured — otherwise
 * skipped entirely in favor of the public-API method above.
 *
 * DEVNOVATE_API_MOCK=true bypasses both for local development.
 */

const MONGO_OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export interface DevnovateVerifyResult {
  listed: boolean;
  isCoHost: boolean;
}

export class DevnovateApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "DevnovateApiError";
  }
}

// Local fixture used only when DEVNOVATE_API_MOCK=true (development/demo mode).
const MOCK_EVENTS: Record<string, { listed: boolean; organizerIds: string[] }> = {
  "devnovate-2026-hackathon": {
    listed: true,
    organizerIds: ["000000000000000000000001", "aaaaaaaaaaaaaaaaaaaaaaaa"],
  },
  "devnovate-2026-ai-summit": {
    listed: true,
    organizerIds: ["000000000000000000000001"],
  },
};

async function fetchFromMock(devnovateEventId: string): Promise<DevnovateVerifyResult> {
  const event = MOCK_EVENTS[devnovateEventId];
  if (!event) {
    throw new DevnovateApiError("Event not found on devnovate.co", 404);
  }
  // Mock mode always uses this fixed id, independent of the real env var —
  // predictable for local testing regardless of production configuration.
  const requiredId = "aaaaaaaaaaaaaaaaaaaaaaaa";
  return {
    listed: event.listed,
    isCoHost: event.organizerIds.some((id) => id.toLowerCase() === requiredId),
  };
}

// Primary: devnovate.co's own public event-lookup API — already live, no
// backend changes required.
async function fetchFromPublicApi(devnovateEventId: string): Promise<DevnovateVerifyResult> {
  const requiredOrganizerId = process.env.REQUIRED_DEVNOVATE_ORGANIZER_ID;
  if (!requiredOrganizerId || !MONGO_OBJECT_ID_RE.test(requiredOrganizerId)) {
    throw new DevnovateApiError(
      "REQUIRED_DEVNOVATE_ORGANIZER_ID is not configured (needs the real 24-character Mongo ObjectId)",
      503
    );
  }

  const encodedSlug = encodeURIComponent(devnovateEventId);
  const res = await fetch(`https://devnovate.co/api/v1/events/name/${encodedSlug}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    // The URL is our own fixed template with a regex-validated slug interpolated
    // in (validated in validation.ts before this is ever called) — not
    // organizer-supplied, so no redirect/SSRF hardening is needed here.
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });

  if (res.status === 404) {
    throw new DevnovateApiError("Event not found on devnovate.co", 404);
  }
  if (!res.ok) {
    throw new DevnovateApiError(`devnovate.co API error (${res.status})`, res.status);
  }

  const data = (await res.json()) as {
    hackathon?: { live?: boolean; organizers?: string[] };
  };
  const hackathon = data.hackathon;
  if (!hackathon) {
    throw new DevnovateApiError("Unexpected response from devnovate.co", 502);
  }

  const normalizedRequired = requiredOrganizerId.toLowerCase();
  const isCoHost = (hackathon.organizers ?? []).some((id) => id.toLowerCase() === normalizedRequired);

  return { listed: hackathon.live === true, isCoHost };
}

// Secondary/optional: the external verification endpoint from
// devnovate-api-patch/, only used if it's actually been deployed and
// configured — matched by email rather than ObjectId.
async function fetchFromExternalPatch(
  devnovateEventId: string,
  email: string
): Promise<DevnovateVerifyResult> {
  const baseUrl = process.env.DEVNOVATE_API_URL!;
  const apiKey = process.env.DEVNOVATE_API_KEY!;

  const encodedId = encodeURIComponent(devnovateEventId);
  const encodedEmail = encodeURIComponent(email);
  const res = await fetch(`${baseUrl}/events/${encodedId}/verify-cohost?email=${encodedEmail}`, {
    method: "GET",
    headers: { "x-api-key": apiKey, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(8000),
  });

  if (res.status === 404) {
    throw new DevnovateApiError("Event not found on devnovate.co", 404);
  }
  if (!res.ok) {
    throw new DevnovateApiError(`Devnovate API error (${res.status})`, res.status);
  }

  const data = (await res.json()) as {
    success: boolean;
    event: { listed: boolean };
    isCoHost: boolean;
  };

  return { listed: data.event.listed, isCoHost: data.isCoHost };
}

export async function verifyDevnovateCoHost(
  devnovateEventId: string,
  requiredCoHostEmail: string
): Promise<DevnovateVerifyResult> {
  if (process.env.DEVNOVATE_API_MOCK === "true") {
    return fetchFromMock(devnovateEventId);
  }
  if (process.env.REQUIRED_DEVNOVATE_ORGANIZER_ID) {
    return fetchFromPublicApi(devnovateEventId);
  }
  if (process.env.DEVNOVATE_API_URL && process.env.DEVNOVATE_API_KEY) {
    return fetchFromExternalPatch(devnovateEventId, requiredCoHostEmail);
  }
  throw new DevnovateApiError(
    "Devnovate verification is not configured — set REQUIRED_DEVNOVATE_ORGANIZER_ID (preferred, no backend changes needed) or DEVNOVATE_API_URL/DEVNOVATE_API_KEY",
    503
  );
}
