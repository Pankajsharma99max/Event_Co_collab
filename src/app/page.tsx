import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { EventCard } from "@/components/event-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[35%] right-[-10%] h-[600px] w-[600px] rounded-full bg-white/[0.05] blur-[140px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-[20%] left-[-10%] h-[400px] w-[400px] rounded-full bg-white/[0.035] blur-[120px]"
        />

        <div className="relative mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-glass px-4 py-1.5 text-xs font-medium text-muted-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Verified listings only — every co-host is confirmed before publishing
          </span>
          <h1 className="mx-auto mt-7 max-w-3xl font-display text-5xl font-normal leading-[1.05] tracking-tight sm:text-7xl">
            Submit your event.
            <br />
            <span className="italic">Reach the community.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            Submit your event and connect with the world&apos;s largest AI events community
            — powered by Devnovate.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link
              href="/submit"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              Submit an event
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to get listed.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          One flow to submit, verify, and publish — no back-and-forth with the Devnovate team.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard title="Submit in minutes" desc="Tell us about your event once — title, format, location, and your Luma link." />
          <SpotlightCard />
          <FeatureCard title="Co-host verification" desc="Luma events are verified automatically by confirming the required Devnovate organizer is added as a co-host." />
          <FeatureCard title="Organizer dashboard" desc="Track every submission's status — pending, verified, published — in one place." />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Recently listed</h2>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
            No events published yet — be the first to submit one.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex min-h-[200px] flex-col justify-between rounded-2xl bg-surface p-6">
      <div />
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted">{desc}</p>
      </div>
    </div>
  );
}

function SpotlightCard() {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl bg-white p-6 text-center text-black">
      <p className="text-sm font-medium text-black/60">Devnovate Submit</p>
      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3">
        <Stat value="Auto + manual" label="verification" />
        <Stat value="Luma" label="platform supported" />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-black/50">{label}</p>
    </div>
  );
}
