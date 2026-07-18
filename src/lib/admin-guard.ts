import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Server-component-only guard — every /admin page calls this first. Redirects
// rather than rendering a 403 so an unauthenticated visitor doesn't learn
// the admin panel exists at all; a signed-in non-admin gets sent home.
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Re-check role fresh from the DB rather than trusting session.user.role,
  // which is cached in the JWT at sign-in time. Without this, demoting an
  // admin from the Users page wouldn't take effect until their session
  // naturally expires (up to 7 days) — a stale-privilege window.
  const current = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (current?.role !== "ADMIN") {
    redirect("/");
  }

  return session;
}
