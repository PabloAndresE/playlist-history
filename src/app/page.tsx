import Link from "next/link";
import ChangeBadge from "@/components/ui/Changebadge";

const demoChanges = [
  {
    type: "REMOVED" as const,
    track: "Human",
    artist: "The Killers",
    album: "Day & Age",
    image: "https://i.scdn.co/image/ab67616d00004851a43cd43ef4f3b2d5413b17f9",
  },
  {
    type: "REMOVED" as const,
    track: "Piano Man",
    artist: "Billy Joel",
    album: "The Essential Billy Joel",
    image: "https://i.scdn.co/image/ab67616d00004851649d4f282653ab8be56f447e",
  },
  {
    type: "ADDED" as const,
    track: "Son Of A Preacher Man",
    artist: "Dusty Springfield",
    album: "The Silver Collection",
    image: "https://i.scdn.co/image/ab67616d000048515827c499129d9d9b4eaa536a",
  },
  {
    type: "ADDED" as const,
    track: "Walking in Memphis",
    artist: "Marc Cohn",
    album: "Marc Cohn",
    image: "https://i.scdn.co/image/ab67616d000048515908f448fb4605e4eba3dbf9",
  },
  {
    type: "ADDED" as const,
    track: "Streets",
    artist: "Kensington",
    album: "Rivals",
    image: "https://i.scdn.co/image/ab67616d0000485162aa69bc38d1b1eb719b9217",
  },
];

const faqs = [
  {
    q: "Does Spotify show the history of tracks that were once in a playlist?",
    a: "No. When a track is removed from a playlist, it is no longer possible to find out that the track was ever in the playlist. This is the reason Playlist History exists.",
  },
  {
    q: "At what frequency does Playlist History check for changes?",
    a: "Every day, all tracked playlists are checked for changes automatically. You can also trigger a manual sync at any time.",
  },
  {
    q: "Can I restore a playlist to a previous state?",
    a: "Yes! Every time changes are detected, we save a full snapshot. You can browse your snapshots and restore your playlist to any previous point in time.",
  },
  {
    q: "What analytics are available?",
    a: "We track genre distribution, artist diversity, playlist growth by decade, hidden gems, biggest hits, and more. All from day one.",
  },
];

export default function HomePage() {
  return (
    <div className="bg-gray-950">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1DB954]/20 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 mb-8">
            <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
            <span className="text-sm text-gray-300">
              Tracking playlist changes daily
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight text-white">
            Never lose a song from{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1DB954] to-[#1ed760]">
              your playlists
            </span>{" "}
            again.
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
            We track every change to your Spotify playlists. See what was added,
            what was removed, dive into analytics, and restore any playlist to a
            previous state.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/api/auth/signin"
              className="bg-[#1DB954] text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#1ed760] hover:scale-105 transition-all shadow-lg shadow-[#1DB954]/25"
            >
              Start tracking free
            </Link>
            <Link
              href="/explore"
              className="text-gray-300 font-medium px-6 py-3.5 rounded-full border border-white/20 hover:bg-white/5 transition-all"
            >
              See examples
            </Link>
          </div>
          <p className="mt-6 text-xs text-gray-600">
            Free forever. Uses the official Spotify API.
          </p>
        </div>
      </section>

      {/* Demo table */}
      <section className="max-w-3xl mx-auto px-4 -mt-12 relative z-10 pb-20">
        <div className="rounded-2xl border border-white/10 bg-gray-900 shadow-2xl shadow-black/40 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                My Favorite Mix
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                3 songs added, 2 removed
              </p>
            </div>
            <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">
              Live demo
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {demoChanges.map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                  item.type === "REMOVED"
                    ? "bg-red-500/5"
                    : "bg-green-500/5"
                }`}
              >
                <img
                  src={item.image}
                  alt=""
                  className="w-11 h-11 rounded-lg shadow-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {item.track}
                    </span>
                    <ChangeBadge type={item.type} />
                  </div>
                  <span className="text-xs text-gray-500">{item.artist}</span>
                </div>
                <span className="text-sm text-gray-500 hidden md:block">
                  {item.album}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            How it works
          </h2>
          <p className="text-center text-gray-500 mb-14 max-w-lg mx-auto">
            Three simple steps to never miss a playlist change again.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="w-14 h-14 bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-xl font-bold text-[#1DB954]">1</span>
              </div>
              <h3 className="font-semibold text-white text-lg">Connect Spotify</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Log in with your Spotify account. We only read your playlists, nothing else.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-xl font-bold text-[#1DB954]">2</span>
              </div>
              <h3 className="font-semibold text-white text-lg">Pick playlists</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Choose which playlists you want to monitor. We start tracking immediately.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <span className="text-xl font-bold text-[#1DB954]">3</span>
              </div>
              <h3 className="font-semibold text-white text-lg">See every change</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                Every addition and removal is logged. Browse history, analytics, and restore anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            More than just history
          </h2>
          <p className="text-center text-gray-500 mb-14">
            Powerful tools to understand how your playlists evolve.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-[#1DB954]/30 hover:bg-[#1DB954]/5 transition-all">
              <div className="w-12 h-12 bg-[#1DB954]/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-lg">Analytics</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                Genre distribution, artist diversity, decades, hidden gems, and popularity insights.
              </p>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-lg">Social</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                See who added or removed tracks in collaborative playlists. Activity feed per contributor.
              </p>
            </div>
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white text-lg">Snapshot & Restore</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                Browse your playlist at any point in time and restore it with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Questions?
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Everything you need to know about Playlist History.
          </p>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="group border border-white/10 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer text-sm font-medium text-gray-200 hover:bg-white/5 transition-colors">
                  {faq.q}
                  <svg className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to track your playlists?
          </h2>
          <p className="text-gray-500 mb-8">
            Connect your Spotify account and start monitoring changes in seconds.
          </p>
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 bg-[#1DB954] text-white font-semibold px-8 py-3.5 rounded-full hover:bg-[#1ed760] hover:scale-105 transition-all shadow-lg shadow-[#1DB954]/25"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Get started with Spotify
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center">
        <p className="text-sm text-gray-600">
          Built with the Spotify API. Not affiliated with Spotify AB.
        </p>
      </footer>
    </div>
  );
}
