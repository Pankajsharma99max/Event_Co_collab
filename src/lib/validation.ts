import { z } from "zod";

// Shared input-validation schemas. Every API route parses its body through
// one of these before touching the database or calling out to Devnovate —
// nothing user-supplied is trusted as-is.

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).toLowerCase(),
  password: z.string().min(10).max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).toLowerCase(),
  password: z.string().min(1).max(200),
});

const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: "Invalid date",
});

export const EVENT_FORMATS = ["IN_PERSON", "HYBRID"] as const;
export const EVENT_TYPES = [
  "GENERAL_MEETUP",
  "HACKATHON",
  "CONFERENCE",
  "WORKSHOP",
  "DEMO_NIGHT",
  "PARTY",
] as const;
export const TICKETING_TYPES = ["FREE", "PAID", "HYBRID"] as const;
export const ATTENDEE_BUCKETS = ["UNDER_50", "50_150", "150_300", "300_PLUS"] as const;
export const EVENT_THEMES = [
  "agents",
  "evals",
  "infrastructure",
  "safety",
  "multimodal",
  "voice",
  "robotics",
  "data",
  "applications",
  "research",
  "other",
] as const;

export const eventDetailsSchema = z.object({
  title: z.string().trim().min(3).max(140),
  // Description and dates are no longer collected in the submission form —
  // the organizer's own event link is the source of truth for those. Kept
  // optional (not removed) so the field can still be set later if ever
  // needed, without another schema change.
  description: z.string().trim().min(20).max(5000).optional().or(z.literal("")),
  eventFormat: z.enum(EVENT_FORMATS),
  eventType: z.enum(EVENT_TYPES),
  ticketingType: z.enum(TICKETING_TYPES),
  expectedAttendees: z.enum(ATTENDEE_BUCKETS).optional(),
  themes: z.array(z.enum(EVENT_THEMES)).min(1, "Pick at least one theme").max(11),
  wantsSponsorship: z.boolean().optional().default(false),
  additionalInfo: z.string().trim().max(3000).optional(),
  startsAt: isoDate.optional().or(z.literal("")),
  endsAt: isoDate.optional().or(z.literal("")),
  location: z.string().trim().min(2).max(200),
  // Restrict to Luma event URLs (lu.ma or luma.com)
  websiteUrl: z
    .string()
    .trim()
    .url()
    .max(2000)
    .refine((val) => {
      try {
        const hostname = new URL(val).hostname.toLowerCase();
        return (
          hostname === "luma.com" ||
          hostname === "lu.ma" ||
          hostname.endsWith(".lu.ma") ||
          hostname.endsWith(".luma.com")
        );
      } catch {
        return false;
      }
    }, "Only Luma event URLs (lu.ma or luma.com) are supported"),
  // Only required for events hosted on devnovate.co — enforced in the API
  // route once the platform is derived from websiteUrl, not here, since that
  // derivation needs the parsed URL first. No longer has its own form field;
  // only ever populated if an admin sets it directly.
  devnovateEventId: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,100}$/, "Use the event's devnovate.co slug (lowercase letters, numbers, hyphens)")
    .optional()
    .or(z.literal("")),
});

// Both startsAt/endsAt are optional now, so the "end after start" rule only
// applies when the organizer provided both — used by both the create and
// update event routes.
export function invalidDateRange(startsAt?: string, endsAt?: string): boolean {
  if (!startsAt || !endsAt) return false;
  return new Date(endsAt) <= new Date(startsAt);
}

export function toOptionalDate(value?: string): Date | null {
  return value ? new Date(value) : null;
}

export const sponsorshipSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(20).max(3000),
  budgetRange: z.string().trim().min(1).max(60),
  contactEmail: z.string().trim().email().max(254),
});
