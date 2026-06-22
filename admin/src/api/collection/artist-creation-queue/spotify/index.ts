type SpotifyTokenResponse = {
  access_token: string;
  expires_in: number;
};

type SpotifySearchResponse = {
  artists?: {
    items?: SpotifyArtist[];
  };
};

type SpotifyArtist = {
  id: string;
  name: string;
};

let accessToken: string | null = null;
let tokenExpiresAt = 0;

export async function getArtistId(artistName: string): Promise<string> {
  const query = artistName.trim();

  if (!query) {
    return "";
  }

  const artist = await searchSpotifyArtist(query);

  return artist?.id ?? "";
}

async function searchSpotifyArtist(
  artistName: string,
): Promise<SpotifyArtist | null> {
  const token = await getAccessToken();
  const url = new URL("https://api.spotify.com/v1/search");

  url.searchParams.set("q", artistName);
  url.searchParams.set("type", "artist");
  url.searchParams.set("limit", "10");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Spotify artist search failed: ${response.statusText}`);
  }

  const data = (await response.json()) as SpotifySearchResponse;
  const artists = data.artists?.items ?? [];

  return findBestMatch(artistName, artists);
}

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to get Spotify access token: ${response.statusText}`,
    );
  }

  const data = (await response.json()) as SpotifyTokenResponse;

  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60_000;

  return accessToken;
}

function findBestMatch(
  artistName: string,
  artists: SpotifyArtist[],
): SpotifyArtist | null {
  const normalizedArtistName = normalizeName(artistName);

  return (
    artists.find((artist) => normalizeName(artist.name) === normalizedArtistName) ??
    artists[0] ??
    null
  );
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
