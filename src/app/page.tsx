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

export default function HomePage() {
  return (
    <div className="bg-surface-0">
      {/* Hero — asymmetric split */}
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-24 md:pt-20 md:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,1.1fr] gap-10 lg:gap-20 items-start">
          <div className="lg:pt-8">
            <div className="inline-flex items-center gap-2 bg-accent-muted border border-accent/20 rounded-lg px-3 py-1.5 mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-accent font-medium">
                Tracking changes daily
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl lg:text-[3.25rem] font-bold leading-[1.08] tracking-tight text-text-primary">
              Your playlists have a history.
              <br />
              <span className="text-text-secondary font-normal">Now you can see it.</span>
            </h1>
            <p className="mt-6 text-base text-text-secondary max-w-sm leading-relaxed">
              Every song added or removed, tracked automatically.
              Analytics, restore points, and collaborative activity.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <Link
                href="/api/auth/signin"
                className="bg-accent text-white font-semibold px-6 py-3 rounded-lg hover:bg-accent-hover transition-colors"
              >
                Start tracking free
              </Link>
              <Link
                href="/explore"
                className="text-text-secondary font-medium px-5 py-3 rounded-lg border border-border hover:border-text-muted transition-colors"
              >
                See examples
              </Link>
            </div>
            <p className="mt-4 text-xs text-text-muted">
              Free forever. Read-only Spotify access.
            </p>
          </div>

          {/* Demo table — the strongest visual */}
          <div className="rounded-xl border border-border bg-surface-1 overflow-hidden shadow-xl shadow-black/8">
            <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  My Favorite Mix
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  3 added, 2 removed &middot; today
                </p>
              </div>
              <span className="text-[10px] text-text-muted bg-surface-2 px-2.5 py-1 rounded">
                Live demo
              </span>
            </div>
            <div className="divide-y divide-border-subtle">
              {demoChanges.map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    item.type === "REMOVED" ? "bg-removed-muted" : "bg-added-muted"
                  }`}
                >
                  <img
                    src={item.image}
                    alt={`${item.track} album cover`}
                    className="w-10 h-10 rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {item.track}
                      </span>
                      <ChangeBadge type={item.type} />
                    </div>
                    <span className="text-xs text-text-secondary">{item.artist}</span>
                  </div>
                  <span className="text-xs text-text-muted hidden md:block">
                    {item.album}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works — minimal, no cards */}
      <section className="border-t border-border-subtle py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-widest mb-10">
            How it works
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8">
            <div>
              <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-text-primary">
                Connect Spotify
              </p>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Log in with your account. We request read-only access to your playlists — nothing else.
              </p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-text-primary">
                Pick what to track
              </p>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Choose which playlists matter to you. We snapshot them daily and log every change.
              </p>
            </div>
            <div>
              <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-text-primary">
                Explore & restore
              </p>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Browse your playlist at any point in time. See analytics, discover patterns, restore songs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics preview — show the value visually */}
      <section className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-widest mb-3">
            What you get
          </p>
          <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-text-primary mb-4">
            Discover what your playlists say about you
          </h2>
          <p className="text-text-secondary max-w-lg mb-10">
            Genre breakdowns, artist diversity, hidden gems, popularity scores — all computed automatically from your playlists.
          </p>

          {/* Mock analytics dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Genres donut + list */}
            <div className="bg-surface-1 rounded-xl border border-border-subtle p-5">
              <p className="text-sm font-semibold text-text-primary mb-1">Genres</p>
              <p className="text-xs text-text-muted mb-4">What your playlist sounds like</p>
              <div className="flex gap-4 items-center">
                {/* CSS donut chart */}
                <div className="w-20 h-20 shrink-0 rounded-full relative"
                  style={{
                    background: "conic-gradient(#1DB954 0% 28%, #818cf8 28% 46%, #f59e0b 46% 60%, #06b6d4 60% 72%, #f472b6 72% 82%, #e8e4dd 82% 100%)"
                  }}
                >
                  <div className="absolute inset-[22%] bg-surface-1 rounded-full" />
                </div>
                <div className="space-y-1.5 flex-1">
                  {[
                    { name: "rock", color: "#1DB954", pct: 28 },
                    { name: "indie", color: "#818cf8", pct: 18 },
                    { name: "pop", color: "#f59e0b", pct: 14 },
                    { name: "electronic", color: "#06b6d4", pct: 12 },
                    { name: "soul", color: "#f472b6", pct: 10 },
                  ].map((g) => (
                    <div key={g.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="text-xs text-text-secondary flex-1">{g.name}</span>
                      <span className="text-xs text-text-muted tabular-nums">{g.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Decades bar chart */}
            <div className="bg-surface-1 rounded-xl border border-border-subtle p-5">
              <p className="text-sm font-semibold text-text-primary mb-1">Decades</p>
              <p className="text-xs text-text-muted mb-4">1978 to 2024</p>
              <div className="flex items-end gap-1.5" style={{ height: "112px" }}>
                {[
                  { decade: "70s", h: 14 },
                  { decade: "80s", h: 28 },
                  { decade: "90s", h: 45 },
                  { decade: "00s", h: 65 },
                  { decade: "10s", h: 95 },
                  { decade: "20s", h: 78 },
                ].map((d) => (
                  <div key={d.decade} className="flex-1 flex flex-col items-center gap-1" style={{ height: "100%" }}>
                    <div className="flex-1" />
                    <div
                      className="w-full bg-accent rounded-t"
                      style={{ height: `${d.h}px` }}
                    />
                    <span className="text-[10px] text-text-muted leading-none">{d.decade}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hipster score + hidden gems */}
            <div className="bg-surface-1 rounded-xl border border-border-subtle p-5">
              <p className="text-sm font-semibold text-text-primary mb-1">Taste profile</p>
              <p className="text-xs text-text-muted mb-4">How obscure is your playlist?</p>
              <div className="text-center mb-4">
                <p className="font-[family-name:var(--font-heading)] text-4xl font-bold text-text-primary">67</p>
                <p className="text-xs text-text-muted mt-0.5">Pretty obscure</p>
              </div>
              <div className="h-2 bg-surface-3 rounded-full overflow-hidden mb-1">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-purple w-[67%]" />
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] text-text-muted">Mainstream</span>
                <span className="text-[10px] text-text-muted">Underground</span>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle">
                <p className="text-xs text-text-muted mb-2">Hidden gem</p>
                <div className="flex items-center gap-2">
                  <img
                    src="https://i.scdn.co/image/ab67616d0000485162aa69bc38d1b1eb719b9217"
                    alt="Album cover"
                    className="w-8 h-8 rounded"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">Streets</p>
                    <p className="text-[10px] text-text-muted">Kensington &middot; 2.1K listeners</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other features — text only, not cards */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-text-primary">
                Collaborative activity
              </h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                See who added or removed tracks in shared playlists. A live activity feed
                for every contributor — finally know who deleted your favorite song.
              </p>
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-heading)] text-xl font-semibold text-text-primary">
                Snapshot & restore
              </h3>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                We save your playlist state every day. Browse any version and restore it
                to Spotify with one click. Like version control for your music.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — left-aligned, not centered */}
      <section className="border-t border-border-subtle py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl font-bold text-text-primary">
              Start tracking your playlists
            </h2>
            <p className="text-text-secondary mt-2">
              Free, takes 30 seconds, no credit card.
            </p>
          </div>
          <Link
            href="/api/auth/signin"
            className="inline-flex items-center gap-2 bg-accent text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-accent-hover transition-colors shrink-0 self-start"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
            Get started with Spotify
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-6">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs text-text-muted">
            Built with the Spotify API. Not affiliated with Spotify AB.
          </p>
        </div>
      </footer>
    </div>
  );
}
