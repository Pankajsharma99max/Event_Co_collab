import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { ensureBootstrapRole } from "@/lib/role";
import { authBasePathServer } from "@/lib/base-path";

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  trustHost: true,
  // Bare "/api/auth" — the route handler receives the path with Next's
  // basePath already stripped, so this must NOT include the sub-path prefix
  // (the client SessionProvider carries the prefixed value instead).
  basePath: authBasePathServer,
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = loginSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Brute-force guard: cap attempts per IP and per targeted email independently.
        const ip = getClientIp(request);
        const ipLimit = rateLimit(`login:ip:${ip}`, { limit: 20, windowMs: 5 * 60_000 });
        const emailLimit = rateLimit(`login:email:${email}`, { limit: 10, windowMs: 5 * 60_000 });
        if (!ipLimit.success || !emailLimit.success) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // No passwordHash means this account was created via an OAuth
        // provider (e.g. Google) and has no password to check against.
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        const role = await ensureBootstrapRole(user);
        return { id: user.id, email: user.email, name: user.name, role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.provider === "google") {
        const email = token.email;
        if (!email) return token;

        // No adapter is wired up (Credentials + database sessions don't mix
        // in Auth.js), so link/create the local User record by email here.
        let dbUser = await prisma.user.findUnique({ where: { email } });
        if (!dbUser) {
          dbUser = await prisma.user.create({
            data: {
              email,
              name: token.name ?? email.split("@")[0],
              passwordHash: null,
            },
          });
        }
        token.id = dbUser.id;
        token.role = await ensureBootstrapRole(dbUser);
        return token;
      }

      if (user) {
        token.id = user.id;
        token.role = (user as { role?: "USER" | "ADMIN" }).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN" | undefined) ?? "USER";
      }
      return session;
    },
  },
});

export const isGoogleAuthConfigured = googleConfigured;
