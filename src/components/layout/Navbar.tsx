"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        active
          ? "text-text-primary font-medium"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
      {active && (
        <span className="block h-0.5 bg-accent rounded-full mt-0.5" />
      )}
    </Link>
  );
}

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-surface-0/80 backdrop-blur-xl border-b border-border-subtle">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-[family-name:var(--font-heading)] text-lg font-bold text-text-primary tracking-tight">
          Playlist History
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {session ? (
            <>
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/social">Social</NavLink>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Sign out
              </button>
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt={session.user.name || "Profile"}
                  className="w-7 h-7 rounded-full ring-2 ring-border"
                />
              )}
            </>
          ) : (
            <button
              onClick={() => signIn("spotify")}
              className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors cursor-pointer"
            >
              Login with Spotify
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-text-secondary hover:text-text-primary transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden border-t border-border-subtle bg-surface-0 px-4 overflow-hidden transition-all duration-200 ease-out ${
          menuOpen ? "max-h-64 py-4" : "max-h-0 py-0"
        }`}
      >
        <div className="space-y-3">
          {session ? (
            <>
              <Link href="/dashboard" className="block text-sm text-text-secondary hover:text-text-primary" onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <Link href="/social" className="block text-sm text-text-secondary hover:text-text-primary" onClick={() => setMenuOpen(false)}>
                Social
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="block text-sm text-text-secondary hover:text-text-primary">
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("spotify")}
              className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              Login with Spotify
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
