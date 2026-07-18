import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { eventDetailsSchema, invalidDateRange, toOptionalDate } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { detectPlatform } from "@/lib/platform";

export async function GET() {
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      eventType: true,
      eventFormat: true,
      startsAt: true,
      endsAt: true,
      location: true,
      websiteUrl: true,
      status: true,
    },
  });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const limited = rateLimit(`create-event:${session.user.id}`, { limit: 10, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
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
  if (platform === "DEVNOVATE" && !data.devnovateEventId) {
    return NextResponse.json(
      { error: "Devnovate.co event slug is required for events hosted on devnovate.co" },
      { status: 400 }
    );
  }

  const event = await prisma.event.create({
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
      // 96 bits of randomness — infeasible to guess or collide with, so an
      // exact match on this later is a real proof of control, not a guess.
      verificationToken: `devnovate-verify-${randomBytes(12).toString("hex")}`,
      submittedById: session.user.id,
      status: "PENDING_VERIFICATION",
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
