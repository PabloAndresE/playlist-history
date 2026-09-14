import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import SessionProvider from "@/components/layout/SessionProvider";

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const heading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Playlist History for Spotify",
  description:
    "Track changes in your Spotify playlists. See additions, removals, analytics, and restore playlists to any point in time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${heading.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface-0 text-text-primary font-[family-name:var(--font-body)]">
        <SessionProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
