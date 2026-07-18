/**
 * Sub-path deployment support.
 *
 * This app is designed to be mountable under a URL prefix so it can live at
 * `devnovate.co/submit-event` (a sub-path of the main Devnovate site), while
 * still running standalone at the root during local development.
 *
 * Set NEXT_PUBLIC_BASE_PATH to the prefix (e.g. "/submit-event") to enable it;
 * leave it empty (the default) to run at the root. The NEXT_PUBLIC_ prefix is
 * required because these helpers run in the browser too, and Next.js only
 * inlines NEXT_PUBLIC_* env vars into the client bundle.
 *
 * Next.js applies `basePath` automatically to <Link>, useRouter, and route
 * handling — but NOT to raw browser `fetch("/api/...")` calls or to
 * `next/image` string `src` values. Those must be prefixed manually via
 * `withBasePath()` below.
 */

// Normalized so it's either "" or "/segment" (no trailing slash).
export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

// Auth.js mount path — asymmetric on purpose:
//
//  - CLIENT (browser) fetches the full public path, prefix included, so
//    signIn/signOut/getProviders hit e.g. "/submit-event/api/auth/*".
//  - SERVER route handler receives the path with Next's basePath ALREADY
//    stripped, so Auth.js's own `basePath` must be the bare "/api/auth"
//    (confirmed empirically: giving it the prefixed value makes it fail to
//    parse the action → "Bad request").
export const authBasePathClient = `${basePath}/api/auth`;
export const authBasePathServer = "/api/auth";

/** Prefix an absolute in-app path (API route, public asset) with the basePath. */
export function withBasePath(path: string): string {
  return `${basePath}${path}`;
}
