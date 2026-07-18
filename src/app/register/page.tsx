"use client";

import Link from "next/link";
import { GoogleAuthSection } from "@/components/google-sign-in-button";

export default function RegisterPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-6 py-20">
      <h1 className="text-center font-display text-3xl">Create your organizer account</h1>
      <p className="mt-1 text-center text-sm text-muted">Submit and manage your Devnovate event listings.</p>

      <div className="mt-8 rounded-2xl bg-surface p-6 sm:p-8">
        <GoogleAuthSection callbackUrl="/submit" />
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
