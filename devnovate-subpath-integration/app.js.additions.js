/* ===========================================================================
 * MERGE GUIDE — how to mount "Devnovate Submit" at devnovate.co/submit-event
 * ===========================================================================
 *
 * This is NOT a runnable file. It shows the EXACT lines to add to your live
 * backend/app.js (github.com/Devnovate/Devnovate) and precisely WHERE, using
 * the real surrounding code from your current app.js as anchors so the merge
 * is unambiguous. Total change: 3 added lines + 1 copied middleware file + 1
 * npm dependency. Nothing existing is modified or removed.
 *
 * Prerequisite: the Submit app runs as its own process (see ecosystem.config.js
 * in this folder), built with NEXT_PUBLIC_BASE_PATH="/submit-event", listening
 * on 127.0.0.1:3100. And in backend/:  npm install http-proxy-middleware
 * --------------------------------------------------------------------------- */


/* ---------------------------------------------------------------------------
 * ADDITION 1 of 2  —  require the proxy middleware
 *
 * Near the TOP of backend/app.js, where the other routers are required. Your
 * current file has this block (around lines 20-46):
 *
 *     const managerRouter = require('./routes/managerRoutes');
 *     const checkinRouter = require('./routes/checkinRoutes');
 *     ...
 *     const uploadRouter = require('./routes/uploadRoutes');
 *
 * >>> ADD this line anywhere in that group of requires: <<<
 * ------------------------------------------------------------------------- */

const submitEventProxy = require("./middleware/submitEventProxy");


/* ---------------------------------------------------------------------------
 * ADDITION 2 of 2  —  mount the proxy BEFORE the SPA fallback
 *
 * This is the critical part. Your app.js serves the API routes, then the
 * built React SPA, then a catch-all that returns index.html for EVERYTHING
 * else. Your current file (around lines 185-242) looks like this:
 *
 *     app.use("/api/v1/upload", uploadRouter);
 *
 *     // Serve uploaded images statically
 *     app.use("/uploads", express.static(path.join(__dirname, "uploads")));
 *
 *     app.use(express.static(path.join(__dirname, "../frontend/dist")));   // <-- SPA assets
 *     ...
 *     app.get("*", (req, res) => {                                         // <-- SPA catch-all
 *       res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
 *     });
 *
 * >>> ADD the mount line below RIGHT AFTER the last `app.use("/api/v1/...")`
 *     router and BEFORE `app.use(express.static(... /frontend/dist ...))`. <<<
 *
 * Why here: if it were placed after `app.get("*")`, the SPA would swallow
 * /submit-event and return index.html instead of proxying. Placing it above
 * the static + catch-all guarantees the /submit-event prefix is handed to the
 * Next.js app. It sits below the real /api routers so it can never shadow them.
 * ------------------------------------------------------------------------- */

app.use("/submit-event", submitEventProxy);


/* ---------------------------------------------------------------------------
 * That's the whole merge. After deploying:
 *
 *   GET https://devnovate.co/                 -> your existing React SPA (unchanged)
 *   GET https://devnovate.co/api/v1/events    -> your existing Express API (unchanged)
 *   GET https://devnovate.co/submit-event     -> Devnovate Submit (Next.js app)
 *   GET https://devnovate.co/submit-event/... -> everything under it (pages, its
 *                                                own /submit-event/api/*, assets)
 *
 * The proxy does NOT rewrite the path — the Next app is built to own the
 * /submit-event prefix itself, so requests pass straight through.
 * ------------------------------------------------------------------------- */
