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
    a: "Every 6 hours, all tracked playlists are checked for changes automatically. You can also trigger a manual sync at any time.",
  },
  {
    q: "Can I restore a playlist to a previous state?",
    a: "Yes! Every time changes are detected, we save a full snapshot. You can browse your snapshots and restore your playlist to any previous point in time.",
  },
  {
    q: "What analytics are available?",
    a: "We track genre evolution over time, artist rotation (who comes and goes), playlist growth, and collaborative activity for shared playlists.",
  },
];

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
          Keep track of the changes in your favorite playlists on{" "}
          <span className="text-[#1DB954]">Spotify.</span>
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto">
          We check every 6 hours for changes to your playlists. See additions,
          removals, analytics, and even restore playlists to any point in time.
        </p>
        <p className="mt-3 text-sm text-gray-400">
          This is not an official Spotify product. We use the Spotify API to
          fetch data from your account.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/api/auth/signin"
            className="bg-[#1DB954] text-white font-medium px-6 py-3 rounded-full hover:bg-[#1aa34a] transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/explore"
            className="text-gray-600 font-medium px-6 py-3 rounded-full border border-gray-200 hover:border-gray-300 transition-colors"
          >
            Explore
          </Link>
        </div>
      </section>

      {/* Demo table */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr] gap-4 px-4 py-3 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <span className="w-10" />
            <span>Title</span>
            <span className="hidden md:block">Album</span>
          </div>
          {demoChanges.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-[auto_1fr_1fr] gap-4 px-4 py-3 border-t border-gray-50 items-center"
            >
              <img
                src={item.image}
                alt=""
                className="w-10 h-10 rounded"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
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
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            More than just history
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Analytics</h3>
              <p className="mt-2 text-sm text-gray-500">
                Genre evolution, artist rotation, and growth trends for every playlist you track.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Social</h3>
              <p className="mt-2 text-sm text-gray-500">
                See who added or removed tracks in collaborative playlists. Activity feed per contributor.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Snapshot & Restore</h3>
              <p className="mt-2 text-sm text-gray-500">
                Browse your playlist at any point in time and restore it with one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-20">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
          Frequently asked questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details key={i} className="group border border-gray-100 rounded-lg">
              <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium text-gray-900">
                {faq.q}
                <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="px-4 pb-4 text-sm text-gray-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center">
        <p className="text-sm text-gray-400">
          Built with the Spotify API. Not affiliated with Spotify.
        </p>
      </footer>
    </div>
  );
}
