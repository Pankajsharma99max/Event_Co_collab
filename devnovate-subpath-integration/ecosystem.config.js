/**
 * pm2 process config for running "Devnovate Submit" (this Next.js app) as a
 * managed service alongside the main Devnovate backend, so the reverse proxy
 * in backend/app.js always has something to forward /submit-event to.
 *
 * Usage (from THIS app's root, after `npm run build`):
 *     pm2 start devnovate-subpath-integration/ecosystem.config.js
 *     pm2 save        # persist across reboots
 *
 * The app must have been built with NEXT_PUBLIC_BASE_PATH="/submit-event" in
 * its .env (basePath is inlined at build time — see this folder's README).
 */
module.exports = {
  apps: [
    {
      name: "devnovate-submit",
      // `next start` serves the production build created by `npm run build`.
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: __dirname + "/..", // this app's root (one level up from this folder)
      env: {
        NODE_ENV: "production",
        // Must match what the main backend's proxy targets (SUBMIT_EVENT_TARGET).
        PORT: "3100",
        // Bind to loopback only — the main site's proxy is the public entry point.
        HOSTNAME: "127.0.0.1",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "300M",
    },
  ],
};
