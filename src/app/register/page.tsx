"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { GoogleAuthSection } from "@/components/google-sign-in-button";
import { withBasePath } from "@/lib/base-path";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const res = await fetch(withBasePath("/api/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      const signInRes = await signIn("credentials", { email, password, redirect: false });
      if (signInRes?.error) {
        // Stay on this page so the message is actually visible — navigating
        // to /login here would unmount this component before the user ever
        // saw it.
        setError("Account created, but automatic sign-in failed. Please sign in manually below.");
        setLoading(false);
        return;
      }
      router.push("/submit");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-6 py-20">
      <h1 className="text-center font-display text-3xl">Create your organizer account</h1>
      <p className="mt-1 text-center text-sm text-muted">Submit and manage your Devnovate event listings.</p>

      <div className="mt-8 rounded-2xl bg-surface p-6 sm:p-8">
        <GoogleAuthSection callbackUrl="/submit" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 outline-none focus:border-white/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 outline-none focus:border-white/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={10}
              maxLength={200}
              autoComplete="new-password"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 outline-none focus:border-white/40"
            />
            <p className="mt-1 text-xs text-muted">At least 10 characters.</p>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-white px-4 py-2.5 font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
