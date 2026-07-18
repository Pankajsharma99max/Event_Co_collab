import { prisma } from "@/lib/prisma";

// Bootstrap mechanism for granting the first admin(s): list emails here (env
// var, comma-separated) and they're promoted to ADMIN the next time they
// sign in. After that, role changes go through the admin panel itself
// (Users page) — this only ever promotes, never demotes, and only touches
// the specific emails listed.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export async function ensureBootstrapRole(user: {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}): Promise<"USER" | "ADMIN"> {
  if (user.role === "ADMIN") return "ADMIN";
  if (!ADMIN_EMAILS.has(user.email.toLowerCase())) return user.role;

  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  return "ADMIN";
}
