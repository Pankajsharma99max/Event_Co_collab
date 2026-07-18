// Reverse-proxy /submit-event/* to the standalone Devnovate Submit (Next.js)
// app, so it appears as a page of the main site at devnovate.co/submit-event.
//
// Drop-in for the live Devnovate backend (github.com/Devnovate/Devnovate,
// backend/). Nothing in the main repo needs to be rewritten — you add this
// file and two lines to app.js (see this folder's README).
//
// Requires: npm i http-proxy-middleware  (in backend/)
//
// The Next.js app must be running with NEXT_PUBLIC_BASE_PATH="/submit-event"
// and listening on SUBMIT_EVENT_TARGET (default http://127.0.0.1:3100). Since
// the Next app is built with that basePath, it already emits /submit-event/*
// URLs for all its own links, assets, API and auth routes — so this proxy is
// a straight pass-through with no path rewriting.

const { createProxyMiddleware } = require("http-proxy-middleware");

const target = process.env.SUBMIT_EVENT_TARGET || "http://127.0.0.1:3100";

const submitEventProxy = createProxyMiddleware({
  target,
  changeOrigin: false, // keep the devnovate.co Host header so Auth.js (trustHost) builds correct URLs
  xfwd: true, // forward X-Forwarded-* so the Next app sees the real client IP + proto
  ws: true, // proxy websockets (Next dev HMR; harmless in prod)
  // No pathRewrite: the Next app owns the /submit-event prefix itself.
  proxyTimeout: 30000,
  timeout: 30000,
});

module.exports = submitEventProxy;
