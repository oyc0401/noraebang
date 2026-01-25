export interface SpotifyOembedResponse {
  title: string;
  type: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  provider_name: string;
  provider_url: string;
  html?: string;
}

export async function fetchSpotifyOembed(
  trackUrl: string,
): Promise<SpotifyOembedResponse> {
  const oembedUrl = new URL("https://open.spotify.com/oembed");
  oembedUrl.searchParams.set("url", trackUrl);

  const response = await fetch(oembedUrl);
  if (!response.ok) {
    throw new Error(
      `Spotify oEmbed request failed (status ${response.status})`,
    );
  }
  return (await response.json()) as SpotifyOembedResponse;
}
