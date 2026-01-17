import { ChannelType } from "@prisma/client";

import {
  fetchYoutubeChannel,
  searchYoutubeChannels,
} from "../../thirdparty/youtube";
import { prisma } from "../prisma";

// mapArtistYoutubeChannel은 단일 아티스트의 유튜브 토픽/메인 채널을 검색해 DB에 반영합니다.

export interface MapArtistYoutubeChannelOptions {
  dryRun?: boolean;
  verbose?: boolean;
  searchQuery?: string;
  maxResults?: number;
}

type ExistingChannelSnapshot = {
  id: number;
  channelId: string;
  title?: string | null;
  subscriberCount?: number | null;
};

export interface MapArtistYoutubeChannelResult {
  artist: {
    id: number;
    name: string;
    nameKo: string;
    topicChannel?: ExistingChannelSnapshot | null;
    mainChannel?: ExistingChannelSnapshot | null;
  };
  candidates: YoutubeChannelCandidateSummary[];
  topicChannel: ChannelMappingSummary;
  mainChannel: ChannelMappingSummary | null;
  stats: {
    candidateCount: number;
    topicUpdated: boolean;
    mainUpdated: boolean;
    dryRun: boolean;
  };
}

export interface YoutubeChannelCandidateSummary {
  channelId: string;
  title: string;
  description?: string;
  subscriberCount?: number;
  isTopicChannel: boolean;
}

export interface ChannelMappingSummary {
  type: ChannelType;
  action: "created" | "updated" | "skipped" | "not_found";
  channelId?: string;
  title?: string;
  subscriberCount?: number;
  reason?: string;
}

type YoutubeChannelDetails = {
  channelId: string;
  title: string;
  description?: string;
  customUrl?: string;
  publishedAt?: string;
  country?: string;
  defaultLanguage?: string;
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: bigint;
  hiddenSubscriberCount?: boolean;
  uploadsPlaylistId?: string;
};

type ChannelCandidate = {
  details: YoutubeChannelDetails;
  isTopicChannel: boolean;
};

const DEFAULT_MAX_RESULTS = 3;

const normalizeTitle = (value: string) =>
  value.toLowerCase().replace(/\s+/g, "");

const isTopicChannelTitle = (title?: string | null) =>
  Boolean(title) && title.toLowerCase().endsWith(" - topic");

const stripTopicSuffix = (title?: string | null) =>
  title ? title.replace(/ - topic$/i, "").trim() : "";

export async function mapArtistYoutubeChannel(
  artistId: number,
  options: MapArtistYoutubeChannelOptions = {},
): Promise<MapArtistYoutubeChannelResult> {
  const { dryRun = false, verbose = false } = options;
  const log = verbose ? console.log : () => {};

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      youtubeChannels: {
        select: {
          id: true,
          type: true,
          channelId: true,
          title: true,
          subscriberCount: true,
        },
      },
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  const existingTopic = artist.youtubeChannels.find(
    (channel) => channel.type === ChannelType.TOPIC,
  );
  const existingMain = artist.youtubeChannels.find(
    (channel) => channel.type === ChannelType.MAIN,
  );

  const searchTerm =
    options.searchQuery?.trim() ||
    artist.name?.trim() ||
    artist.nameKo?.trim() ||
    "";

  if (!searchTerm) {
    throw new Error("Search query is empty.");
  }

  log(`\n[Artist #${artist.id}] ${artist.name} (${artist.nameKo})`);
  log(`  🔍 Search query: "${searchTerm}"`);

  const candidates = await collectChannelCandidates(
    searchTerm,
    options.maxResults ?? DEFAULT_MAX_RESULTS,
  );

  const candidateSummaries: YoutubeChannelCandidateSummary[] = candidates.map(
    (candidate) => ({
      channelId: candidate.details.channelId,
      title: candidate.details.title,
      description: candidate.details.description,
      subscriberCount: candidate.details.subscriberCount,
      isTopicChannel: candidate.isTopicChannel,
    }),
  );

  log(`  Candidates found: ${candidateSummaries.length}`);

  const topicCandidate =
    candidates.find((candidate) => candidate.isTopicChannel) ?? null;

  let topicAction: ChannelMappingSummary = {
    type: ChannelType.TOPIC,
    action: "not_found",
    reason: "No topic-style channel found in search results.",
  };
  let mainAction: ChannelMappingSummary | null = null;
  let topicUpdated = false;
  let mainUpdated = false;

  if (topicCandidate) {
    log(
      `  🎯 Topic candidate: ${topicCandidate.details.title} (${topicCandidate.details.channelId})`,
    );
    log(
      `     Subscribers: ${topicCandidate.details.subscriberCount?.toLocaleString() || "Hidden"}`,
    );

    if (!dryRun) {
      await upsertYoutubeChannel(
        artist.id,
        ChannelType.TOPIC,
        topicCandidate.details,
      );
    }

    topicUpdated = true;
    topicAction = {
      type: ChannelType.TOPIC,
      action: existingTopic ? "updated" : "created",
      channelId: topicCandidate.details.channelId,
      title: topicCandidate.details.title,
      subscriberCount: topicCandidate.details.subscriberCount,
      reason: dryRun ? "Dry-run mode: no DB changes applied." : undefined,
    };

    const mainCandidate = findMainCandidate(candidates, topicCandidate);
    const topicSubscribers = topicCandidate.details.subscriberCount ?? 0;
    const mainSubscribers = mainCandidate?.details.subscriberCount ?? 0;

    if (mainCandidate && mainSubscribers > topicSubscribers) {
      log(
        `  ⭐️ Main candidate: ${mainCandidate.details.title} (${mainCandidate.details.channelId})`,
      );
      log(
        `     Subscribers: ${mainSubscribers.toLocaleString() || "Hidden"}`,
      );

      if (!dryRun) {
        await upsertYoutubeChannel(
          artist.id,
          ChannelType.MAIN,
          mainCandidate.details,
        );
      }

      mainUpdated = true;
      mainAction = {
        type: ChannelType.MAIN,
        action: existingMain ? "updated" : "created",
        channelId: mainCandidate.details.channelId,
        title: mainCandidate.details.title,
        subscriberCount: mainSubscribers,
        reason: dryRun ? "Dry-run mode: no DB changes applied." : undefined,
      };
    } else {
      mainAction = {
        type: ChannelType.MAIN,
        action: "skipped",
        reason: mainCandidate
          ? "Existing topic channel has equal or higher subscribers."
          : "No matching main channel candidate found.",
      };
    }
  }

  if (!topicCandidate) {
    log("  ⚠️  No topic channel candidate found.");
  }

  return {
    artist: {
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      topicChannel: existingTopic
        ? snapshotChannel(existingTopic)
        : undefined,
      mainChannel: existingMain ? snapshotChannel(existingMain) : undefined,
    },
    candidates: candidateSummaries,
    topicChannel: topicAction,
    mainChannel: mainAction,
    stats: {
      candidateCount: candidateSummaries.length,
      topicUpdated,
      mainUpdated,
      dryRun,
    },
  };
}

function snapshotChannel(channel: {
  id: number;
  channelId: string;
  title: string | null;
  subscriberCount: number | null;
}): ExistingChannelSnapshot {
  return {
    id: channel.id,
    channelId: channel.channelId,
    title: channel.title,
    subscriberCount: channel.subscriberCount,
  };
}

async function collectChannelCandidates(
  query: string,
  maxResults: number,
): Promise<ChannelCandidate[]> {
  const data = await searchYoutubeChannels(query, maxResults);
  const items = Array.isArray(data.items) ? data.items : [];
  const candidates: ChannelCandidate[] = [];

  for (const item of items) {
    const id =
      typeof (item as any).id === "string"
        ? ((item as any).id as string)
        : item.id?.channelId;
    if (!id) continue;

    const details = await getChannelDetails(id);
    candidates.push({
      details,
      isTopicChannel: isTopicChannelTitle(details.title),
    });
  }

  return candidates;
}

async function getChannelDetails(channelId: string): Promise<YoutubeChannelDetails> {
  const data = await fetchYoutubeChannel({ channelId });
  const channel = data.items?.[0];
  if (!channel) {
    throw new Error(`Channel not found: ${channelId}`);
  }

  const snippet = channel.snippet ?? {};
  const statistics = channel.statistics ?? {};
  const thumbnails = (snippet as any)?.thumbnails ?? {};
  const branding = channel.brandingSettings as
    | { channel?: { country?: string }; defaultLanguage?: string }
    | undefined;
  const contentDetails = channel.contentDetails as
    | { relatedPlaylists?: { uploads?: string } }
    | undefined;

  return {
    channelId: channel.id,
    title: (snippet as any).title ?? "",
    description: (snippet as any).description ?? undefined,
    customUrl: (snippet as any).customUrl ?? undefined,
    publishedAt: (snippet as any).publishedAt ?? undefined,
    country: branding?.channel?.country,
    defaultLanguage:
      (snippet as any).defaultLanguage ?? branding?.defaultLanguage,
    thumbnailDefault: thumbnails?.default?.url,
    thumbnailMedium: thumbnails?.medium?.url,
    thumbnailHigh: thumbnails?.high?.url,
    subscriberCount: statistics?.subscriberCount
      ? Number(statistics.subscriberCount)
      : undefined,
    videoCount: statistics?.videoCount
      ? Number(statistics.videoCount)
      : undefined,
    viewCount: statistics?.viewCount
      ? BigInt(statistics.viewCount as string)
      : undefined,
    hiddenSubscriberCount:
      typeof statistics?.hiddenSubscriberCount === "boolean"
        ? (statistics.hiddenSubscriberCount as boolean)
        : undefined,
    uploadsPlaylistId: contentDetails?.relatedPlaylists?.uploads,
  };
}

function findMainCandidate(
  candidates: ChannelCandidate[],
  topicCandidate: ChannelCandidate,
): ChannelCandidate | null {
  const baseTitle = stripTopicSuffix(topicCandidate.details.title);
  const normalizedBase = normalizeTitle(baseTitle);

  return (
    candidates.find(
      (candidate) =>
        !candidate.isTopicChannel &&
        normalizeTitle(candidate.details.title) === normalizedBase,
    ) ?? null
  );
}

async function upsertYoutubeChannel(
  artistId: number,
  type: ChannelType,
  details: YoutubeChannelDetails,
) {
  const data = buildYoutubeChannelData(details);

  await prisma.youtubeChannel.upsert({
    where: {
      artistId_type: {
        artistId,
        type,
      },
    },
    create: {
      artistId,
      type,
      ...data,
    },
    update: data,
  });
}

function buildYoutubeChannelData(details: YoutubeChannelDetails) {
  return {
    channelId: details.channelId,
    title: details.title ?? null,
    description: details.description ?? null,
    customUrl: details.customUrl ?? null,
    publishedAt: details.publishedAt ? new Date(details.publishedAt) : null,
    country: details.country ?? null,
    defaultLanguage: details.defaultLanguage ?? null,
    thumbnailDefault: details.thumbnailDefault ?? null,
    thumbnailMedium: details.thumbnailMedium ?? null,
    thumbnailHigh: details.thumbnailHigh ?? null,
    subscriberCount: details.subscriberCount ?? null,
    videoCount: details.videoCount ?? null,
    viewCount: details.viewCount ?? null,
    hiddenSubscriberCount:
      typeof details.hiddenSubscriberCount === "boolean"
        ? details.hiddenSubscriberCount
        : null,
    uploadsPlaylistId: details.uploadsPlaylistId ?? null,
    fetchedAt: new Date(),
  };
}
