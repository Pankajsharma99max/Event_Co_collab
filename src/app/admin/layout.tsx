import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";

export const metadata = { title: "Admin — Devnovate Submit" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="mt-1 text-sm text-muted">
            Internal tools for this submission app only — separate from devnovate.co&apos;s
            own admin system.
          </p>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link
            href="/admin/events"
            className="rounded-full border border-border bg-glass px-4 py-2 font-medium hover:bg-glass-strong"
          >
            Events
          </Link>
          <Link
            href="/admin/sponsorships"
            className="rounded-full border border-border bg-glass px-4 py-2 font-medium hover:bg-glass-strong"
          >
            Sponsorships
          </Link>
          <Link
            href="/admin/users"
            className="rounded-full border border-border bg-glass px-4 py-2 font-medium hover:bg-glass-strong"
          >
            Users
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
