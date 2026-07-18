import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin · Sponsorships — Devnovate Submit" };

async function toggleSponsorship(sponsorshipId: string, status: "OPEN" | "CLOSED") {
  "use server";
  await requireAdmin();
  await prisma.sponsorship.update({ where: { id: sponsorshipId }, data: { status } });
  revalidatePath("/admin/sponsorships");
}

export default async function AdminSponsorshipsPage() {
  await requireAdmin();

  const sponsorships = await prisma.sponsorship.findMany({
    include: { postedBy: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-3">
      {sponsorships.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          No sponsorship posts yet.
        </div>
      ) : (
        sponsorships.map((s) => (
          <div key={s.id} className="rounded-2xl bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{s.title}</p>
                <p className="mt-0.5 text-sm text-muted">
                  Posted by {s.postedBy.name} ({s.postedBy.email}) · {s.budgetRange}
                </p>
                <p className="mt-1.5 max-w-xl text-sm text-muted">{s.description}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  s.status === "OPEN" ? "bg-white text-black" : "bg-glass text-muted"
                }`}
              >
                {s.status}
              </span>
            </div>

            <div className="mt-4 flex gap-2">
              <form action={toggleSponsorship.bind(null, s.id, "OPEN")}>
                <button
                  type="submit"
                  disabled={s.status === "OPEN"}
                  className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black transition hover:bg-white/90 disabled:opacity-40"
                >
                  Reopen
                </button>
              </form>
              <form action={toggleSponsorship.bind(null, s.id, "CLOSED")}>
                <button
                  type="submit"
                  disabled={s.status === "CLOSED"}
                  className="rounded-full border border-border bg-glass px-4 py-1.5 text-xs font-medium text-muted-2 transition hover:text-foreground disabled:opacity-40"
                >
                  Close
                </button>
              </form>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
