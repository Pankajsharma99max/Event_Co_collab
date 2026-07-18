import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sponsorshipSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const sponsorships = await prisma.sponsorship.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ sponsorships });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const limited = rateLimit(`create-sponsorship:${session.user.id}`, { limit: 10, windowMs: 60_000 });
  if (!limited.success) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sponsorshipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const sponsorship = await prisma.sponsorship.create({
    data: { ...parsed.data, postedById: session.user.id },
  });

  return NextResponse.json({ sponsorship }, { status: 201 });
}
