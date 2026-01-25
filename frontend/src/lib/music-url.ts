const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
];

const SPOTIFY_PATTERNS = [/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/];

export const isYoutubeUrl = (url: string): boolean =>
  YOUTUBE_PATTERNS.some((p) => p.test(url));

export const isSpotifyUrl = (url: string): boolean =>
  SPOTIFY_PATTERNS.some((p) => p.test(url));

export const isMusicUrl = (url: string): boolean =>
  isYoutubeUrl(url) || isSpotifyUrl(url);

export const extractVideoId = (url: string): string | undefined => {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return undefined;
};

export const extractSpotifyTrackId = (url: string): string | undefined => {
  for (const pattern of SPOTIFY_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return undefined;
};
