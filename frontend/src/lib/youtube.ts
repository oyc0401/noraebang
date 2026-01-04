const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
];

export const isYoutubeUrl = (url: string): boolean =>
  YOUTUBE_PATTERNS.some((p) => p.test(url));

export const extractVideoId = (url: string): string | undefined => {
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return undefined;
};
