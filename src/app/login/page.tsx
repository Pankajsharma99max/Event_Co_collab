"use client";

import Link from "next/link";
import { GoogleAuthSection } from "@/components/google-sign-in-button";

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-6 py-20">
      <h1 className="text-center font-display text-3xl">Sign in</h1>
      <p className="mt-1 text-center text-sm text-muted">Manage your submitted Devnovate events.</p>

      <div className="mt-8 rounded-2xl bg-surface p-6 sm:p-8">
        <GoogleAuthSection callbackUrl="/dashboard" />
      </div>

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
