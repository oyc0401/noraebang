import {
  searchYoutubeChannels,
  fetchYoutubeChannel,
} from "../thirdparty/youtube/index.ts";

const CHANNEL_ID_REGEX = /^UC[0-9A-Za-z_-]{22}$/;

export type ChannelIdentifier = {
  channelId?: string;
  handle?: string;
  username?: string;
  query?: string;
};

function sanitizePotentialId(value: string) {
  return value.split("?")[0].split("&")[0].trim();
}

function tryParseUrl(value: string) {
  try {
    if (/^https?:\/\//i.test(value)) {
      return new URL(value);
    }

    return new URL(`https://${value}`);
  } catch {
    return null;
  }
}

export function parseChannelIdentifier(raw: string): ChannelIdentifier {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error("YouTube 채널 URL 또는 ID를 입력해주세요.");
  }

  const possibleDirectId = sanitizePotentialId(trimmed);
  if (CHANNEL_ID_REGEX.test(possibleDirectId)) {
    return { channelId: possibleDirectId };
  }

  const maybeUrl = tryParseUrl(trimmed);
  if (maybeUrl) {
    const pathSegments = maybeUrl.pathname
      .split("/")
      .map((seg) => seg.trim())
      .filter(Boolean);

    if (pathSegments[0]?.startsWith("@")) {
      const handle = pathSegments[0].replace(/^@/, "");
      if (handle) return { handle };
    }

    if (
      (maybeUrl.host.includes("youtube.com") ||
        maybeUrl.host.includes("music.youtube.com")) &&
      pathSegments[0] === "channel" &&
      pathSegments[1]
    ) {
      const candidateId = sanitizePotentialId(pathSegments[1]);
      if (CHANNEL_ID_REGEX.test(candidateId)) {
        return { channelId: candidateId };
      }
    }

    if (pathSegments[0] === "user" && pathSegments[1]) {
      return { username: pathSegments[1] };
    }

    if (pathSegments[0] === "c" && pathSegments[1]) {
      return { query: pathSegments[1] };
    }

    if (
      !pathSegments.length &&
      maybeUrl.host.includes("youtube.com") &&
      maybeUrl.hash.startsWith("#@")
    ) {
      return { handle: maybeUrl.hash.replace("#@", "") };
    }
  }

  if (trimmed.startsWith("@")) {
    return { handle: trimmed.replace(/^@/, "") };
  }

  return { query: trimmed };
}

function pickBestSearchCandidate(items: any[], handle?: string) {
  if (!items || items.length === 0) return null;
  if (!handle) return items[0];

  const normalized = handle.toLowerCase();
  return (
    items.find((item) => {
      const customUrl = item.snippet?.customUrl ?? "";
      const title = item.snippet?.channelTitle ?? "";
      return (
        customUrl.toLowerCase() === normalized ||
        title.toLowerCase() === normalized
      );
    }) ?? items[0]
  );
}

export async function fetchChannelFromYoutube(identifier: ChannelIdentifier) {
  async function fetchByChannelId(channelId: string) {
    const data = await fetchYoutubeChannel({ channelId });
    const channel = data.items?.[0];
    if (!channel) {
      throw new Error("해당 채널 정보를 찾을 수 없습니다.");
    }
    return channel;
  }

  async function fetchByHandle(handle: string) {
    const data = await fetchYoutubeChannel({ handle });
    return data.items?.[0] ?? null;
  }

  async function fetchByUsername(username: string) {
    const data = await fetchYoutubeChannel({ username });
    return data.items?.[0] ?? null;
  }

  if (identifier.channelId) {
    return fetchByChannelId(identifier.channelId);
  }

  if (identifier.handle) {
    const result = await fetchByHandle(identifier.handle);
    if (result) return result;
  }

  if (identifier.username) {
    const result = await fetchByUsername(identifier.username);
    if (result) return result;
  }

  const searchTerm = identifier.handle
    ? `@${identifier.handle}`
    : identifier.query;

  if (!searchTerm) {
    throw new Error("채널 식별자를 알 수 없습니다. 주소를 다시 확인해주세요.");
  }

  const searchData = await searchYoutubeChannels(searchTerm);
  if (!searchData.items || searchData.items.length === 0) {
    throw new Error("검색된 채널이 없습니다.");
  }

  const candidate = pickBestSearchCandidate(
    searchData.items,
    identifier.handle,
  );

  const candidateId =
    candidate?.id && typeof candidate.id !== "string"
      ? candidate.id.channelId
      : candidate?.id;

  if (!candidateId) {
    throw new Error("검색 결과에서 채널 ID를 확인할 수 없습니다.");
  }

  return fetchByChannelId(candidateId);
}

export function buildYoutubeChannelData(channel: any) {
  const snippet = channel.snippet ?? {};
  const statistics = channel.statistics ?? {};
  const branding = channel.brandingSettings?.channel ?? {};

  const subscriberCount = statistics.subscriberCount
    ? parseInt(statistics.subscriberCount, 10)
    : undefined;
  const videoCount = statistics.videoCount
    ? parseInt(statistics.videoCount, 10)
    : undefined;
  const viewCount = statistics.viewCount
    ? BigInt(statistics.viewCount)
    : undefined;
  const hiddenSubscriberCount =
    typeof statistics.hiddenSubscriberCount === "boolean"
      ? statistics.hiddenSubscriberCount
      : undefined;

  return {
    channelId: channel.id,
    title: snippet.title,
    description: snippet.description ?? branding.description ?? undefined,
    customUrl: snippet.customUrl ?? undefined,
    publishedAt: snippet.publishedAt
      ? new Date(snippet.publishedAt)
      : undefined,
    country: branding.country ?? snippet.country ?? undefined,
    defaultLanguage: snippet.defaultLanguage ?? undefined,
    thumbnailDefault: snippet.thumbnails?.default?.url,
    thumbnailMedium: snippet.thumbnails?.medium?.url,
    thumbnailHigh: snippet.thumbnails?.high?.url,
    subscriberCount,
    videoCount,
    viewCount,
    hiddenSubscriberCount,
    uploadsPlaylistId: channel.contentDetails?.relatedPlaylists?.uploads,
    fetchedAt: new Date(),
  };
}
