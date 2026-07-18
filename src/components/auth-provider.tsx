"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import { authBasePathClient } from "@/lib/base-path";

// Sets the client-side auth base path so next-auth's signIn/signOut/
// getProviders hit "/{basePath}/api/auth/*" instead of the default
// "/api/auth/*". Also seeds the initial session from the server render so no
// extra client session fetch is needed on load.
export function AuthProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider
      basePath={authBasePathClient}
      session={session}
      refetchOnWindowFocus={false}
    >
      {children}
    </SessionProvider>
  );
}
