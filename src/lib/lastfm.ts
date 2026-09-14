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
  const unique = [...new Set(artistNames)];

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

export interface TrackPopularity {
  name: string;
  artist: string;
  listeners: number;
  playcount: number;
}

export async function getTrackPopularity(
  trackName: string,
  artistName: string
): Promise<TrackPopularity | null> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) return null;

  const url = `${LASTFM_BASE}/?method=track.getInfo&artist=${encodeURIComponent(artistName)}&track=${encodeURIComponent(trackName)}&api_key=${apiKey}&format=json`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.track) return null;

  return {
    name: trackName,
    artist: artistName,
    listeners: parseInt(data.track.listeners) || 0,
    playcount: parseInt(data.track.playcount) || 0,
  };
}

export async function getPopularityForTracks(
  tracks: { name: string; artist: string }[]
): Promise<Map<string, TrackPopularity>> {
  const result = new Map<string, TrackPopularity>();

  for (let i = 0; i < tracks.length; i += 10) {
    const batch = tracks.slice(i, i + 10);
    const promises = batch.map(async (t) => {
      const pop = await getTrackPopularity(t.name, t.artist);
      if (pop) result.set(`${t.artist}::${t.name}`, pop);
    });
    await Promise.all(promises);
  }

  return result;
}
