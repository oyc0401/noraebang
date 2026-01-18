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

export type UnlinkedYoutubeVideo = {
  videoId: string;
  title: string;
  viewCount: number;
  thumbnailMedium?: string;
  publishedAt?: Date;
  channelTitle?: string;
  channelId?: number;
};

export async function getUnlinkedYoutubeVideos(): Promise<UnlinkedYoutubeVideo[]> {
  const videos = await prisma.youtubeVideo.findMany({
    where: {
      songs: {
        none: {},
      },
    },
    orderBy: {
      viewCount: "desc",
    },
    take: 100,
    select: {
      videoId: true,
      title: true,
      viewCount: true,
      thumbnailMedium: true,
      publishedAt: true,
      channels: {
        select: {
          youtubeChannel: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  return videos.map((video) => ({
    videoId: video.videoId,
    title: video.title ?? "",
    viewCount: Number(video.viewCount ?? 0),
    thumbnailMedium: video.thumbnailMedium ?? undefined,
    publishedAt: video.publishedAt ?? undefined,
    channelTitle: video.channels[0]?.youtubeChannel.title ?? undefined,
    channelId: video.channels[0]?.youtubeChannel.id ?? undefined,
  }));
}

export type UnlinkedSpotifyTrack = {
  id: number;
  spotifyId: string;
  name: string;
  popularity: number;
  thumbnails: string[];
  releaseDate?: string;
  artistNames: string[];
};

export async function getUnlinkedSpotifyTracks(): Promise<UnlinkedSpotifyTrack[]> {
  const tracks = await prisma.spotifyTrack.findMany({
    where: {
      OR: [
        { groupId: null },
        {
          group: {
            songs: {
              none: {},
            },
          },
        },
      ],
      disabled: false,
    },
    orderBy: {
      popularity: "desc",
    },
    take: 100,
    select: {
      id: true,
      spotifyId: true,
      name: true,
      popularity: true,
      thumbnails: true,
      releaseDate: true,
      artists: {
        select: {
          spotifyArtist: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return tracks.map((track) => ({
    id: track.id,
    spotifyId: track.spotifyId,
    name: track.name,
    popularity: track.popularity ?? 0,
    thumbnails: track.thumbnails,
    releaseDate: track.releaseDate ?? undefined,
    artistNames: track.artists.map((a) => a.spotifyArtist.name),
  }));
}

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
