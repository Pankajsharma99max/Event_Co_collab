import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { AuthProvider } from "@/components/auth-provider";
import { auth } from "@/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const serifDisplay = DM_Serif_Display({
  variable: "--font-serif-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Devnovate Submit — List your event with the AI builder community",
  description:
    "Submit your event to Devnovate and connect with the world's largest AI builder community.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${serifDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider session={session}>
          <SiteHeader user={session?.user ?? null} />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-10">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-sm font-semibold text-foreground">Contact Us</h2>
            <div className="mt-3 flex flex-col items-center justify-center gap-1 text-sm text-muted-2 sm:flex-row sm:gap-6">
              <p>
                Email:{" "}
                <a href="mailto:info.devnovate@gmail.com" className="hover:text-foreground">
                  info.devnovate@gmail.com
                </a>
              </p>
              <p>
                Phone:{" "}
                <a href="tel:+917075809591" className="hover:text-foreground">
                  +91 70758 09591
                </a>
              </p>
            </div>
            <p className="mt-6 text-xs text-muted">
              Devnovate Submit — built for organizers, verified by Devnovate.
            </p>
          </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
