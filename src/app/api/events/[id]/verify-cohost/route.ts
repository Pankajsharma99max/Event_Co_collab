import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyLumaCoHost, LumaVerificationError } from "@/lib/luma-client";
import { verifyTokenOnPage, TokenVerificationError } from "@/lib/token-page-verifier";

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
    switch (event.platform) {
      case "DEVNOVATE": {
        // Devnovate.co events are reviewed manually by the Devnovate team
        // rather than auto-verified — a deliberate product decision, not a
        // missing feature. src/lib/devnovate-client.ts still has a working
        // automated check (public-API-based, no backend changes needed) if
        // this ever needs to switch back — just call it here the same way
        // the LUMA case below calls verifyLumaCoHost.
        result = {
          success: false,
          manualReview: true,
          reason:
            "Devnovate.co events are reviewed manually by our team. We'll confirm the co-host manager and publish your event shortly.",
        };
        break;
      }

      case "LUMA": {
        const verification = await verifyLumaCoHost(event.websiteUrl, event.requiredLumaHostId);
        result = verification.isCoHost
          ? { success: true, reason: "Confirmed as a host on the Luma event" }
          : {
              success: false,
              reason: `Add luma.com/user/${event.requiredLumaHostId} as a host on your Luma event, then verify again`,
            };
        break;
      }

      default: {
        // Unknown platform — verify by exact proof-of-control token instead
        // of guessing at arbitrary page structure.
        const verification = await verifyTokenOnPage(event.websiteUrl, event.verificationToken);
        if (verification.found) {
          result = { success: true, reason: "Verification code found on your event page" };
        } else if (verification.reason === "NOT_SERVER_RENDERED") {
          result = {
            success: false,
            manualReview: true,
            reason:
              "This page appears to render its content with JavaScript, so we can't automatically read the verification code yet. Your submission has been queued for manual review.",
          };
        } else {
          result = {
            success: false,
            reason: `Verification code not found on the page yet. Paste "${event.verificationToken}" into your event's public description, then verify again.`,
          };
        }
        break;
      }
    }
  } catch (err) {
    if (err instanceof LumaVerificationError || err instanceof TokenVerificationError) {
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
