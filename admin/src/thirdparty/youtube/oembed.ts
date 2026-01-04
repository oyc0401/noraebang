export interface YoutubeOembedResponse {
  title: string;
  author_name: string;
  author_url: string;
  type: string;
  height?: number;
  width?: number;
  version: string;
  provider_name: string;
  provider_url: string;
  thumbnail_height?: number;
  thumbnail_width?: number;
  thumbnail_url?: string;
  html?: string;
}

export async function fetchYoutubeOembed(
  videoUrl: string,
): Promise<YoutubeOembedResponse> {
  const oembedUrl = new URL("https://www.youtube.com/oembed");
  oembedUrl.searchParams.set("url", videoUrl);
  oembedUrl.searchParams.set("format", "json");

  const response = await fetch(oembedUrl);
  if (!response.ok) {
    throw new Error(`YouTube oEmbed request failed (status ${response.status})`);
  }
  return (await response.json()) as YoutubeOembedResponse;
}
