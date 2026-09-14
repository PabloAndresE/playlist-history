const LASTFM_BASE = "https://ws.audioscrobbler.com/2.0";

interface LastFmTag {
  name: string;
  count: number;
}

export async function getArtistTags(
  artistName: string
): Promise<string[]> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) return [];

  const url = `${LASTFM_BASE}/?method=artist.gettoptags&artist=${encodeURIComponent(artistName)}&api_key=${apiKey}&format=json`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  if (!data.toptags?.tag) return [];

  return (data.toptags.tag as LastFmTag[])
    .filter((t) => t.count > 0)
    .slice(0, 5)
    .map((t) => t.name.toLowerCase());
}

export async function getGenresForArtists(
  artistNames: string[]
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();

  // Deduplicate
  const unique = [...new Set(artistNames)];

  // Fetch in parallel batches of 10 to avoid rate limiting
  for (let i = 0; i < unique.length; i += 10) {
    const batch = unique.slice(i, i + 10);
    const promises = batch.map(async (name) => {
      const tags = await getArtistTags(name);
      result.set(name, tags);
    });
    await Promise.all(promises);
  }

  return result;
}
