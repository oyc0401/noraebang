import { fetchYoutubeChannel, searchYoutubeChannels } from "../../../youtube";

export type YoutubeChannelResult = {
  main?: string;
  topic?: string;
};

export type YoutubeThumbnails = {
  normal?: string;
  medium?: string;
  high?: string;
};

export type YoutubeChannelInfo = {
  id: string;
  title: string;
  thumbnails: YoutubeThumbnails;
};

type YoutubeChannelDetails = {
  channelId: string;
  title: string;
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
};

type RawThumbnail = {
  url?: string;
};

type RawSnippet = {
  title?: string;
  thumbnails?: {
    default?: RawThumbnail;
    medium?: RawThumbnail;
    high?: RawThumbnail;
  };
};

export async function getYoutubeChannel(
  artistName: string,
): Promise<YoutubeChannelResult> {
  const query = artistName.trim();

  if (!query) {
    return {};
  }

  const search = await searchYoutubeChannels(query, 5);
  const details = await collectChannelDetails(
    search.items
      .map((item) => item.id?.channelId)
      .filter((channelId): channelId is string => Boolean(channelId)),
  );

  const topic = details.find((channel) => isTopicTitle(channel.title));
  const main = topic
    ? findMainChannel(details, topic)
    : details.find((channel) => !isTopicTitle(channel.title));

  return {
    main: main?.channelId,
    topic: topic?.channelId,
  };
}

export async function getThumbnails(
  youtubeChannelId: string,
): Promise<YoutubeThumbnails> {
  const info = await getYoutubeChannelInfo(youtubeChannelId);

  return info?.thumbnails ?? {};
}

export async function getYoutubeChannelInfo(
  youtubeChannelId: string | null | undefined,
): Promise<YoutubeChannelInfo | null> {
  const channelId = youtubeChannelId?.trim();

  if (!channelId) {
    return null;
  }

  const details = await getChannelDetails(channelId);

  if (!details) {
    return null;
  }

  return {
    id: details.channelId,
    title: details.title,
    thumbnails: {
      normal: details.thumbnailDefault,
      medium: details.thumbnailMedium,
      high: details.thumbnailHigh,
    },
  };
}

async function collectChannelDetails(
  channelIds: string[],
): Promise<YoutubeChannelDetails[]> {
  const details: YoutubeChannelDetails[] = [];

  for (const channelId of channelIds) {
    const detail = await getChannelDetails(channelId);
    if (detail) {
      details.push(detail);
    }
  }

  return details;
}

async function getChannelDetails(
  channelId: string,
): Promise<YoutubeChannelDetails | null> {
  const data = await fetchYoutubeChannel({ channelId });
  const channel = data.items[0];

  if (!channel) {
    return null;
  }

  const snippet = channel.snippet as RawSnippet | undefined;

  return {
    channelId: channel.id,
    title: snippet?.title ?? "",
    thumbnailDefault: snippet?.thumbnails?.default?.url,
    thumbnailMedium: snippet?.thumbnails?.medium?.url,
    thumbnailHigh: snippet?.thumbnails?.high?.url,
  };
}

function findMainChannel(
  channels: YoutubeChannelDetails[],
  topic: YoutubeChannelDetails,
): YoutubeChannelDetails | undefined {
  const topicBaseTitle = normalizeTitle(stripTopicSuffix(topic.title));

  return channels.find(
    (channel) =>
      !isTopicTitle(channel.title) &&
      normalizeTitle(channel.title) === topicBaseTitle,
  );
}

function isTopicTitle(title: string): boolean {
  return title.toLowerCase().endsWith(" - topic");
}

function stripTopicSuffix(title: string): string {
  return title.replace(/ - topic$/i, "").trim();
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, "");
}
