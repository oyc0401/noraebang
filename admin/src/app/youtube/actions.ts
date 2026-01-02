"use server";

import type { ChannelType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  buildYoutubeChannelData,
  fetchChannelFromYoutube,
  parseChannelIdentifier,
} from "@/lib/youtube";

export async function getYoutubeArtists() {
  const artists = await prisma.artist.findMany({
    orderBy: { nameKo: "asc" },
  });

  const artistIds = artists.map((artist) => artist.id);
  const youtubeChannels = artistIds.length
    ? await prisma.youtubeChannel.findMany({
        where: {
          artistId: { in: artistIds },
        },
      })
    : [];

  const channelsByArtist = new Map<number, typeof youtubeChannels>();
  for (const channel of youtubeChannels) {
    const list = channelsByArtist.get(channel.artistId);
    if (list) list.push(channel);
    else channelsByArtist.set(channel.artistId, [channel]);
  }

  const typeOrder: Record<ChannelType, number> = {
    MAIN: 0,
    TOPIC: 1,
  };

  return artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    alias: artist.alias ?? undefined,
    thumbnailDefault: artist.thumbnailDefault ?? undefined,
    thumbnailMedium: artist.thumbnailMedium ?? undefined,
    thumbnailHigh: artist.thumbnailHigh ?? undefined,
    youtubeChannels: (channelsByArtist.get(artist.id) ?? [])
      .sort((a, b) => typeOrder[a.type] - typeOrder[b.type])
      .map((channel) => ({
        id: channel.id,
        type: channel.type,
        channelId: channel.channelId,
        title: channel.title ?? undefined,
        description: channel.description ?? undefined,
        customUrl: channel.customUrl ?? undefined,
        subscriberCount: channel.subscriberCount ?? undefined,
        videoCount: channel.videoCount ?? undefined,
        thumbnailDefault: channel.thumbnailDefault ?? undefined,
        thumbnailMedium: channel.thumbnailMedium ?? undefined,
        thumbnailHigh: channel.thumbnailHigh ?? undefined,
        updatedAt: channel.updatedAt.toISOString(),
      })),
  }));
}

export async function upsertYoutubeChannel(
  artistId: number,
  type: ChannelType,
  input: string,
) {
  const identifier = parseChannelIdentifier(input);
  const channel = await fetchChannelFromYoutube(identifier);

  const existing = await prisma.youtubeChannel.findFirst({
    where: { artistId, type },
  });

  const commonData = buildYoutubeChannelData(channel);

  const upserted = existing
    ? await prisma.youtubeChannel.update({
        where: { id: existing.id },
        data: commonData,
      })
    : await prisma.youtubeChannel.create({
        data: {
          artistId,
          type,
          ...commonData,
        },
      });

  return {
    id: upserted.id,
    type: upserted.type,
    title: upserted.title ?? undefined,
  };
}

export async function deleteYoutubeChannel(
  artistId: number,
  type: ChannelType,
) {
  const target = await prisma.youtubeChannel.findFirst({
    where: { artistId, type },
  });

  if (!target) {
    throw new Error("삭제할 채널 정보를 찾지 못했습니다.");
  }

  await prisma.youtubeChannel.delete({
    where: { id: target.id },
  });

  return { success: true };
}
