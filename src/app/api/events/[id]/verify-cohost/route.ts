import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyLumaCoHost, LumaVerificationError } from "@/lib/luma-client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const ip = getClientIp(req);
  // Verification hits an external API/page — rate-limit per user AND per IP
  // so neither a compromised account nor a single abusive client can hammer it.
  const userLimit = rateLimit(`verify:user:${session.user.id}`, { limit: 15, windowMs: 60_000 });
  const ipLimit = rateLimit(`verify:ip:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!userLimit.success || !ipLimit.success) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  const { id } = await params;

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  // Only the organizer who submitted the event may trigger verification for it.
  if (event.submittedById !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let result: { success: boolean; reason: string; manualReview?: boolean };

  try {
    const verification = await verifyLumaCoHost(event.websiteUrl, event.requiredLumaHostId);
    result = verification.isCoHost
      ? { success: true, reason: "Confirmed as a host on the Luma event" }
      : {
          success: false,
          reason: `Add luma.com/user/${event.requiredLumaHostId} as a host on your Luma event, then verify again`,
        };
  } catch (err) {
    if (err instanceof LumaVerificationError) {
      result = { success: false, reason: err.message };
    } else {
      result = { success: false, reason: "Unable to reach the event page right now" };
    }
  }

  await prisma.$transaction([
    prisma.verificationLog.create({
      data: {
        eventId: event.id,
        success: result.success,
        reason: result.reason,
        requestedBy: session.user.id,
        ipAddress: ip,
      },
    }),
    prisma.event.update({
      where: { id: event.id },
      data: result.success
        ? {
            status: "PUBLISHED",
            coHostVerifiedAt: new Date(),
            listedOnDevnovateAt: new Date(),
          }
        : { status: "PENDING_VERIFICATION" },
    }),
  ]);

  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
