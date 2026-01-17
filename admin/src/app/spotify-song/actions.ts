"use server";

import { prisma } from "@/lib/prisma";
import { MAX_ARTIST } from "@/lib/admin/z-param";

export type SpotifySongIssue = {
  id: number;
  title: string;
  titleKo?: string | null;
  artists: Array<{
    id: number;
    name: string;
    nameKo: string;
  }>;
  tjSong: {
    id: string;
    title?: string | null;
    artist?: string | null;
  } | null;
  hasSpotify: boolean;
  hasYoutube: boolean;
};

export async function getSpotifySongIssues(): Promise<SpotifySongIssue[]> {
  const songs = await prisma.song.findMany({
    where: {
      tjSongId: { not: null },
      artistSongs: {
        some: {
          artistId: { lte: MAX_ARTIST },
        },
      },
      OR: [
        { spotifyTrackGroupId: null },
        {
          AND: [
            { youtubeVideoId: null },
            {
              youtubeVideos: {
                none: {},
              },
            },
          ],
        },
      ],
    },
    orderBy: [
      {
        id: "asc",
      },
    ],
    select: {
      id: true,
      title: true,
      titleKo: true,
      spotifyTrackGroupId: true,
      youtubeVideoId: true,
      tjSong: {
        select: {
          id: true,
          title: true,
          artist: true,
        },
      },
      artistSongs: {
        select: {
          artist: {
            select: {
              id: true,
              name: true,
              nameKo: true,
            },
          },
        },
      },
      youtubeVideos: {
        select: {
          id: true,
        },
      },
    },
  });

  return songs.map((song) => {
    const hasSpotify = Boolean(song.spotifyTrackGroupId);
    const hasYoutube =
      Boolean(song.youtubeVideoId) || song.youtubeVideos.length > 0;

    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      artists: song.artistSongs
        .map((artistSong) => artistSong.artist)
        .sort((a, b) => a.id - b.id),
      tjSong: song.tjSong
        ? {
            id: song.tjSong.id,
            title: song.tjSong.title,
            artist: song.tjSong.artist,
          }
        : null,
      hasSpotify,
      hasYoutube,
    };
  });
}
