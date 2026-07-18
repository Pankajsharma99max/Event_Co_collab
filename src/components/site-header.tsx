import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/auth";
import { withBasePath } from "@/lib/base-path";

interface SiteHeaderProps {
  user: { name?: string | null; email?: string | null; role?: "USER" | "ADMIN" } | null;
}

export function SiteHeader({ user }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="https://devnovate.co/" className="flex items-center">
          <Image
            src={withBasePath("/devnovate-logo.png")}
            alt="Devnovate"
            width={597}
            height={120}
            priority
            className="h-7 w-auto invert"
          />
        </a>

        <nav className="hidden items-center gap-7 text-[13px] font-medium text-muted-2 md:flex">
          {user && (
            <Link href="/dashboard" className="transition hover:text-foreground">
              Dashboard
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin/events" className="transition hover:text-foreground">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/submit"
                className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black transition hover:bg-white/90"
              >
                Submit event
              </Link>
              <form
                action={async () => {
                  "use server";
                  // withBasePath keeps the post-logout redirect inside this
                  // app ("/submit-event/") rather than the main site root.
                  await signOut({ redirectTo: withBasePath("/") });
                }}
              >
                <button
                  type="submit"
                  className="rounded-full border border-border bg-glass px-4 py-2 text-[13px] font-medium text-muted-2 transition hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[13px] font-medium text-muted-2 transition hover:text-foreground">
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-black transition hover:bg-white/90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
