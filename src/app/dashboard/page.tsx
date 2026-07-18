import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Dashboard — Devnovate" };

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-glass text-muted",
  PENDING_VERIFICATION: "bg-amber-500/15 text-amber-400",
  VERIFIED: "bg-success/15 text-success",
  PUBLISHED: "bg-white text-black",
  REJECTED: "bg-danger/15 text-danger",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_VERIFICATION: "Pending verification",
  VERIFIED: "Verified",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const events = await prisma.event.findMany({
    where: { submittedById: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your events</h1>
          <p className="mt-1 text-sm text-muted">Track submission and verification status.</p>
        </div>
        <Link
          href="/submit"
          className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-white/90"
        >
          Submit event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          You haven&apos;t submitted any events yet.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-2xl bg-surface p-5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{event.title}</p>
                  <span className="rounded-full border border-border bg-glass px-2 py-0.5 text-xs text-muted-2">
                    {event.platform}
                  </span>
                </div>
                <a
                  href={event.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-0.5 inline-block text-sm text-muted underline underline-offset-2 hover:text-foreground"
                >
                  {event.websiteUrl}
                </a>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  STATUS_STYLES[event.status] ?? "bg-border text-muted"
                }`}
              >
                {STATUS_LABELS[event.status] ?? event.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
