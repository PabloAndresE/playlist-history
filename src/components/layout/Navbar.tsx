"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <nav
      className={`sticky top-0 z-50 ${
        isLanding
          ? "bg-gray-950/80 backdrop-blur-md border-b border-white/5"
          : "bg-white border-b border-gray-100"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link
          href="/"
          className={`text-lg font-bold ${isLanding ? "text-white" : "text-gray-900"}`}
        >
          Playlist History
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/explore"
            className={`text-sm ${
              isLanding
                ? "text-gray-400 hover:text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Explore
          </Link>
          {session ? (
            <>
              <Link
                href="/dashboard"
                className={`text-sm ${
                  isLanding
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/social"
                className={`text-sm ${
                  isLanding
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Social
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className={`text-sm ${
                  isLanding
                    ? "text-gray-400 hover:text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Sign out
              </button>
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              )}
            </>
          ) : (
            <button
              onClick={() => signIn("spotify")}
              className="bg-[#1DB954] text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-[#1aa34a] transition-colors"
            >
              Login with Spotify
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg
            className={`w-6 h-6 ${isLanding ? "text-white" : "text-gray-900"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className={`md:hidden border-t px-4 py-4 space-y-3 ${
            isLanding
              ? "border-white/5 bg-gray-950"
              : "border-gray-100 bg-white"
          }`}
        >
          <Link
            href="/explore"
            className={`block text-sm ${isLanding ? "text-gray-400" : "text-gray-600"}`}
            onClick={() => setMenuOpen(false)}
          >
            Explore
          </Link>
          {session ? (
            <>
              <Link
                href="/dashboard"
                className={`block text-sm ${isLanding ? "text-gray-400" : "text-gray-600"}`}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                href="/social"
                className={`block text-sm ${isLanding ? "text-gray-400" : "text-gray-600"}`}
                onClick={() => setMenuOpen(false)}
              >
                Social
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className={`block text-sm ${isLanding ? "text-gray-400" : "text-gray-600"}`}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              onClick={() => signIn("spotify")}
              className="bg-[#1DB954] text-white text-sm font-medium px-4 py-2 rounded-full"
            >
              Login with Spotify
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
