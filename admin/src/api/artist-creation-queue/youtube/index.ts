export type YoutubeChannelResult = {
  main?: string;
  topic?: string;
};

export type YoutubeThumbnails = {
  normal?: string;
  medium?: string;
  high?: string;
};

export function getYoutubeChannel(
  artistName: string,
): YoutubeChannelResult {
  void artistName;

  return {};
}

export function getThumbnails(youtubeChannelId: string): YoutubeThumbnails {
  void youtubeChannelId;

  return {};
}
