# Devnovate backend addition: external co-host verification

These files are **not applied to the Devnovate repo** — they're a drop-in addition for whoever
owns `github.com/Devnovate/Devnovate` (`backend/`) to review and add themselves. Nothing in the
cloned repo was modified.

> **Current status:** the submission app doesn't call this today — devnovate.co events are
> reviewed manually by the Devnovate team (an admin approves/rejects from `/admin/events`) rather
> than auto-verified, by product decision. There's also a zero-backend-changes automated option
> (`src/lib/devnovate-client.ts`'s public-API method, matching devnovate.co's own already-public
> `GET /api/v1/events/name/:slug` endpoint) that doesn't need anything in this folder deployed at
> all. This patch remains here as a third option — a dedicated, privacy-minimal endpoint — if you
> ever want to switch devnovate.co verification back to automated.

## What this adds

A read-only endpoint for third-party apps (like the Devnovate Submit app) to check whether a
given email has been appointed as an organizer/co-host on a specific event, and whether that
event is live, **without** exposing the full organizer list or any other event data.

```
GET /api/v1/external/events/:eventSlug/verify-cohost?email=someone@example.com
Header: x-api-key: <EXTERNAL_API_KEY>

200 → { "success": true, "event": { "id", "name", "eventName", "listed": true|false }, "isCoHost": true|false }
400 → missing/invalid email or slug
401 → missing/wrong x-api-key
404 → no event matches eventSlug
503 → EXTERNAL_API_KEY not configured on the server (fails closed, not open)
```

It reuses the same fuzzy slug lookup already in `eventController.getHackathonByName` and the same
`escapeRegex` util, so it matches events the same way the rest of the app does.

## Files

- `middleware/externalApiKey.js` — shared-secret auth for non-browser callers (separate from the
  session/passport auth used everywhere else, since this isn't a browser client).
- `controllers/externalVerifyController.js` — the lookup + email match logic.
- `routes/externalVerifyRoutes.js` — mounts the one route.

## To wire it in (manual — 3 small steps)

1. Copy `middleware/externalApiKey.js`, `controllers/externalVerifyController.js`, and
   `routes/externalVerifyRoutes.js` into the matching folders under `backend/`.
2. In `backend/app.js`, add (near the other route mounts):
   ```js
   const externalVerifyRouter = require('./routes/externalVerifyRoutes');
   // ...
   app.use('/api/v1/external', externalVerifyRouter);
   ```
3. Add `EXTERNAL_API_KEY=<a long random secret>` to `backend/.env` (generate with
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), and give that same
   value to whoever operates the calling app (e.g. as `DEVNOVATE_API_KEY` in the submission app's env).

## Important: this only *checks* co-host status — it doesn't grant it

Appointing someone as a co-host/organizer on an event is a separate, already-existing flow:
`POST /api/v1/events/appointOrganizer` (`eventController.appointOrganizer`), which requires:

- The target already has a Devnovate account with `role` set to `organizer` (or `manager` — both
  are valid values in `User.role`'s enum).
- The caller knows that user's Mongo `_id` (not just their email) and the event's `_id`.

So for the "Add Host" step in a submission flow to work end-to-end, whatever UI collects the
co-host's email needs to resolve it to a `User._id` first (e.g. a `GET /api/v1/users?email=...`
lookup, if one exists or gets added) before calling `appointOrganizer`. That part — and any UI for
it inside devnovate.co itself — is what you're handling directly in the main repo.

## Security notes

- Fails closed if `EXTERNAL_API_KEY` isn't set (returns 503, not open access).
- Never returns the organizer list or any organizer's email besides confirming/denying the one
  email asked about — avoids leaking who else manages an event to an arbitrary caller.
- Sits under `/api/v1/external`, which is still covered by the global `apiLimiter` already applied
  to `/api` in `app.js` (300 req/15 min) — no extra rate limiting needed unless you want it stricter
  for this specific route.
