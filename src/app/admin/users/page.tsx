import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin · Users — Devnovate Submit" };

async function setUserRole(userId: string, role: "USER" | "ADMIN") {
  "use server";
  await requireAdmin();

  if (role === "USER") {
    // Never let the last remaining admin demote themselves (or another admin)
    // out of the role — that would lock everyone out of the admin panel.
    // This count-then-update isn't wrapped in a DB transaction: safe today
    // because better-sqlite3 is a single, synchronous connection (no two
    // requests can interleave between the count and the write), but if this
    // ever moves to Postgres or multiple instances, wrap both in
    // prisma.$transaction to close the theoretical race.
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (target?.role === "ADMIN" && adminCount <= 1) {
      return;
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export default async function AdminUsersPage() {
  const session = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <div className="space-y-3">
      {users.map((u) => (
        <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-5">
          <div>
            <p className="font-semibold">
              {u.name} {u.id === session.user.id && <span className="text-xs text-muted">(you)</span>}
            </p>
            <p className="mt-0.5 text-sm text-muted">{u.email}</p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                u.role === "ADMIN" ? "bg-white text-black" : "bg-glass text-muted"
              }`}
            >
              {u.role}
            </span>
            <form action={setUserRole.bind(null, u.id, u.role === "ADMIN" ? "USER" : "ADMIN")}>
              <button
                type="submit"
                className="rounded-full border border-border bg-glass px-4 py-1.5 text-xs font-medium text-muted-2 transition hover:text-foreground"
              >
                {u.role === "ADMIN" ? "Demote to user" : "Promote to admin"}
              </button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}
