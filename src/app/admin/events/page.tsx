import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin · Events — Devnovate Submit" };

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-glass text-muted",
  PENDING_VERIFICATION: "bg-amber-500/15 text-amber-400",
  VERIFIED: "bg-success/15 text-success",
  PUBLISHED: "bg-white text-black",
  REJECTED: "bg-danger/15 text-danger",
};

const STATUS_ORDER: Record<string, number> = {
  PENDING_VERIFICATION: 0,
  DRAFT: 1,
  VERIFIED: 2,
  PUBLISHED: 3,
  REJECTED: 4,
};

async function setEventStatus(eventId: string, status: "PUBLISHED" | "REJECTED" | "PENDING_VERIFICATION") {
  "use server";
  const session = await requireAdmin();

  await prisma.event.update({
    where: { id: eventId },
    data: {
      status,
      ...(status === "PUBLISHED" ? { coHostVerifiedAt: new Date(), listedOnDevnovateAt: new Date() } : {}),
    },
  });

  await prisma.verificationLog.create({
    data: {
      eventId,
      success: status === "PUBLISHED",
      reason: `Manually set to ${status} by admin`,
      requestedBy: session.user.id,
      ipAddress: "admin-panel",
    },
  });

  revalidatePath("/admin/events");
}

export default async function AdminEventsPage() {
  await requireAdmin();

  const events = await prisma.event.findMany({
    include: {
      submittedBy: { select: { email: true, name: true } },
      verificationLogs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  events.sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));

  return (
    <div className="space-y-3">
      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          No events submitted yet.
        </div>
      ) : (
        events.map((event) => {
          const latestLog = event.verificationLogs[0];
          return (
            <div key={event.id} className="rounded-2xl bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{event.title}</p>
                    <span className="rounded-full border border-border bg-glass px-2 py-0.5 text-xs text-muted-2">
                      {event.platform}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    Submitted by {event.submittedBy.name} ({event.submittedBy.email})
                  </p>
                  <a
                    href={event.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-1 inline-block text-xs text-muted-2 underline underline-offset-2 hover:text-foreground"
                  >
                    {event.websiteUrl}
                  </a>
                  {latestLog && (
                    <p className="mt-2 text-xs text-muted">
                      Last check: {latestLog.success ? "✓" : "✗"} {latestLog.reason}
                    </p>
                  )}
                </div>

                <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[event.status] ?? "bg-glass text-muted"}`}>
                  {event.status}
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <form action={setEventStatus.bind(null, event.id, "PUBLISHED")}>
                  <button
                    type="submit"
                    disabled={event.status === "PUBLISHED"}
                    className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition hover:bg-white/90 disabled:opacity-40"
                  >
                    Approve
                  </button>
                </form>
                <form action={setEventStatus.bind(null, event.id, "REJECTED")}>
                  <button
                    type="submit"
                    disabled={event.status === "REJECTED"}
                    className="rounded-full border border-danger/30 bg-danger/10 px-4 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/20 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </form>
                <form action={setEventStatus.bind(null, event.id, "PENDING_VERIFICATION")}>
                  <button
                    type="submit"
                    disabled={event.status === "PENDING_VERIFICATION"}
                    className="rounded-full border border-border bg-glass px-4 py-1.5 text-xs font-medium text-muted-2 transition hover:text-foreground disabled:opacity-40"
                  >
                    Reset to pending
                  </button>
                </form>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
