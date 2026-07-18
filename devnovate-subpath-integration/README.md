# Serving Devnovate Submit at `devnovate.co/submit-event`

This app is a **standalone Next.js application** (its own process, its own database).
To make it appear as a page of the main Devnovate site at `devnovate.co/submit-event`,
the main site's Express backend reverse-proxies that path prefix to this app.

Nothing in the main `github.com/Devnovate/Devnovate` repo needs to be rewritten — you
add one file and two lines. This mirrors how `devnovate-api-patch/` is packaged.

```
Browser → devnovate.co/submit-event/*
        → (main site Express server: reverse-proxy)
        → Next.js "Devnovate Submit" app (its own port), built with basePath=/submit-event
```

### Files in this folder

| File | What it's for |
| ---- | ------------- |
| `middleware/submitEventProxy.js` | Copy into the main repo's `backend/middleware/`. The reverse proxy itself. |
| `app.js.additions.js` | **Merge guide** — the exact 3 lines to add to the main repo's `backend/app.js` and precisely where (anchored to your real surrounding code). |
| `ecosystem.config.js` | pm2 config to run *this* Submit app as a managed service on port 3100. |
| `README.md` | This file — full walkthrough. |

## 1. Build & run this app with the sub-path

In **this** repo (the Submit app), set the prefix and run it as its own service:

```bash
# .env (this app)
NEXT_PUBLIC_BASE_PATH="/submit-event"
AUTH_SECRET="<a long random secret>"          # keep stable across restarts
AUTH_URL="https://devnovate.co/submit-event/api/auth"   # production only (origin behind the proxy)
# ...the rest of .env as usual (DATABASE_URL, REQUIRED_COHOST_EMAIL, etc.)

npm run build
PORT=3100 npm start        # listens on 127.0.0.1:3100
```

> `NEXT_PUBLIC_BASE_PATH` is inlined at **build** time — you must `npm run build` after
> setting it, not just restart. With it set, the app emits `/submit-event/*` for every
> link, asset, API route and auth endpoint on its own.

Run it under a process manager alongside the main backend — a ready-made pm2 config
is included:

```bash
pm2 start devnovate-subpath-integration/ecosystem.config.js
pm2 save
```

## 2. Add the proxy to the main Devnovate backend

Copy `middleware/submitEventProxy.js` into `backend/middleware/` of the main repo, then:

```bash
cd backend && npm install http-proxy-middleware
```

Then apply the **merge guide** in `app.js.additions.js` — it shows the exact 3 lines to
add to `backend/app.js` and precisely where, anchored to your real surrounding code. In
short: one `require(...)` near the other routers, and the mount below, placed **before**
`express.static(.../frontend/dist)` and the `app.get("*")` SPA catch-all so it wins for
the `/submit-event` prefix:

```js
const submitEventProxy = require("./middleware/submitEventProxy");
// ...mount ABOVE the frontend/dist static middleware and the app.get("*") fallback:
app.use("/submit-event", submitEventProxy);
```

Set `SUBMIT_EVENT_TARGET` in `backend/.env` if the Submit app isn't on the default
`http://127.0.0.1:3100`:

```bash
SUBMIT_EVENT_TARGET="http://127.0.0.1:3100"
```

That's the entire change to the main repo: one `require`, one `app.use`, one dependency.

## Why this ordering matters

`backend/app.js` ends with `app.get("*", …)` returning the SPA `index.html` for every
unmatched path. If the proxy is mounted **after** that catch-all, `/submit-event` would
be swallowed by the SPA. Mounting `app.use("/submit-event", …)` earlier ensures the
prefix is handed to the Next app instead. The proxy does **not** rewrite the path — the
Next app is built to own the `/submit-event` prefix, so requests pass straight through.

## Auth / cookies notes

- The Submit app uses its own JWT session cookie (`authjs.session-token`), distinct from
  the main site's `express-session` cookie (`connect.sid`) — no collision.
- `changeOrigin: false` keeps the `devnovate.co` Host header so Auth.js (`trustHost: true`)
  builds correct absolute URLs. `xfwd: true` forwards the real client IP for rate limiting.
- **Google OAuth under the sub-path** (only if you enable it — it's off by default): the
  route handler receives the path with the Next basePath stripped, so Auth.js builds its
  `redirect_uri` without the `/submit-event` segment. If you turn Google on, register the
  redirect URI Auth.js actually emits (visible in the network tab of the sign-in request)
  in the Google console, or pin it via the provider config. Email/password login has no
  such caveat and works as-is.

## Local end-to-end test (optional)

You can rehearse the whole thing locally:

```bash
# terminal 1 — the Submit app under the prefix
NEXT_PUBLIC_BASE_PATH=/submit-event npm run build && PORT=3100 npm start
# terminal 2 — the main backend with the proxy mounted
cd backend && npm run dev
# then open http://localhost:8000/submit-event
```
