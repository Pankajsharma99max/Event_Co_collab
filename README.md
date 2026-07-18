# Devnovate Submit

A Luma-style "submit your event" flow for [devnovate.co](https://devnovate.co): organizers submit an event, add the required Devnovate co-host manager, get verified, and their event appears in Discover. Also includes a sponsorship-opportunity board.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS, Prisma (SQLite locally, swap the datasource for Postgres/MySQL in production), Auth.js (Credentials + bcrypt, JWT sessions), Zod validation.

## Getting started

```bash
npm install
npx prisma migrate dev
npm run dev
```

Copy `.env.example` to `.env` and fill in real values before deploying (a `.env` with working dev defaults, including `DEVNOVATE_API_MOCK=true`, is already included for local development).

## How verification works

The Collaboration step (`src/components/submit-wizard.tsx`) asks the organizer to add **aviral.lancer@gmail.com** as a Manager co-host on their existing devnovate.co event, then calls `POST /api/events/:id/verify-cohost` (`src/app/api/events/[id]/verify-cohost/route.ts`).

That route calls `src/lib/devnovate-client.ts`, which is a thin client against the contract Devnovate's API is expected to expose:

```
GET {DEVNOVATE_API_URL}/events/{devnovateEventId}
→ { id, listed: boolean, hosts: [{ email, role }] }
```

An event only gets published (and appears under `/discover`) once that check confirms both:
1. The event is actually `listed` (public) on devnovate.co, and
2. `aviral.lancer@gmail.com` is present with `MANAGER` or `OWNER` role.

Until Devnovate's real endpoint ships, `DEVNOVATE_API_MOCK=true` serves fixture data from the same file so the whole flow is testable end-to-end today. Switching to production is a one-line change: unset the mock flag and set `DEVNOVATE_API_URL` / `DEVNOVATE_API_KEY`.

## Security posture

No web app is "unhackable" — what's implemented here is defense in depth against the common OWASP-class issues, not a guarantee:

- **Auth**: bcrypt (cost 12) password hashing, JWT sessions via Auth.js, brute-force rate limits on login (per-IP and per-email).
- **Input validation**: every API route parses its body through a Zod schema (`src/lib/validation.ts`) before touching the database — nothing user-supplied is trusted as-is.
- **SQL injection**: all queries go through Prisma's parameterized query builder; no raw SQL is used.
- **XSS**: React escapes all rendered output by default; no `dangerouslySetInnerHTML` anywhere in the app.
- **CSRF**: Auth.js's built-in CSRF protection for `/api/auth/*`, plus a same-origin check in `src/proxy.ts` for all other state-changing (`POST`/`PUT`/`PATCH`/`DELETE`) requests to `/api/*`.
- **Security headers**: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy` — all set in `src/proxy.ts`.
- **Rate limiting**: per-user/per-IP fixed-window limits on registration, login, event creation, sponsorship posting, and the verify-cohost endpoint (`src/lib/rate-limit.ts`). In-memory, single-instance only — swap for Upstash Redis before scaling to multiple instances.
- **Authorization**: every event/verification route checks that the authenticated user actually owns the resource (`event.submittedById !== session.user.id` → 403).
- **Secrets**: all live in `.env` (gitignored); `.env.example` documents required vars without values.
- **SSRF guard**: the Devnovate API client uses `redirect: "error"` and a fetch timeout so a compromised/misconfigured upstream can't redirect requests to an attacker-controlled host.

### Known accepted risk

`npm audit` flags two moderate advisories in transitive dev dependencies bundled *inside* the latest Next.js and Prisma CLI packages themselves (a vendored `postcss` copy in Next's build tooling, and Prisma's optional local-dev-server helper). No upstream fix exists yet at the pinned versions, and `--force` would downgrade to years-old, more vulnerable releases — so these are monitored, not exploitable at runtime, and not user data paths. Re-run `npm audit` after routine `next`/`prisma` upgrades.

## Project structure

- `src/app/` — pages and API routes (App Router)
- `src/components/` — UI components (stepper, submit wizard, event/sponsorship cards)
- `src/lib/` — Prisma client, Devnovate API client, validation schemas, rate limiter
- `src/proxy.ts` — security headers + CSRF guard (runs on every request)
- `prisma/schema.prisma` — data model
