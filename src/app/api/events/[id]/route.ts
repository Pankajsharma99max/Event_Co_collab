import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { eventDetailsSchema, invalidDateRange, toOptionalDate } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { detectPlatform } from "@/lib/platform";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.submittedById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ event });
}

// Updates an event's own details (used when the organizer goes back from
// step 2 of the submit wizard to fix something) — without this, resubmitting
// step 1 would always POST a brand-new row, leaving the original as an
// orphaned duplicate draft.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const limited = rateLimit(`update-event:${session.user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { id } = await params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (existing.submittedById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = eventDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  if (invalidDateRange(data.startsAt, data.endsAt)) {
    return NextResponse.json({ error: "Event end time must be after start time" }, { status: 400 });
  }

  const platform = detectPlatform(data.websiteUrl);

  const event = await prisma.event.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      eventFormat: data.eventFormat,
      eventType: data.eventType,
      ticketingType: data.ticketingType,
      expectedAttendees: data.expectedAttendees,
      themes: JSON.stringify(data.themes),
      wantsSponsorship: data.wantsSponsorship ?? false,
      additionalInfo: data.additionalInfo || null,
      startsAt: toOptionalDate(data.startsAt),
      endsAt: toOptionalDate(data.endsAt),
      location: data.location,
      websiteUrl: data.websiteUrl,
      platform,
      devnovateEventId: data.devnovateEventId || null,
      // requiredCoHostEmail / requiredLumaHostId / verificationToken are left
      // untouched — they're stable identifiers already shown to the
      // organizer in step 2, and regenerating them would invalidate a code
      // they may have already pasted into their event's description.
    },
  });

  return NextResponse.json({ event });
}
