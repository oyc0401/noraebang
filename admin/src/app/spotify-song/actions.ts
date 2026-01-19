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
  artistId?: number;
  artistName?: string;
  artistNameKo?: string;
};

export async function getUnlinkedYoutubeVideos(): Promise<
  UnlinkedYoutubeVideo[]
> {
  const videos = await prisma.youtubeVideo.findMany({
    where: {
      songs: {
        none: {},
      },
      viewCount: {
        not: null,
        gt: 0,
      },
    },
    orderBy: {
      viewCount: "desc",
    },
    take: 1000,
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
              artist: {
                select: {
                  id: true,
                  name: true,
                  nameKo: true,
                },
              },
            },
          },
        },
        take: 1,
      },
    },
  });

  return videos.map((video) => {
    const artist = video.channels[0]?.youtubeChannel.artist;
    return {
      videoId: video.videoId,
      title: video.title ?? "",
      viewCount: Number(video.viewCount ?? 0),
      thumbnailMedium: video.thumbnailMedium ?? undefined,
      publishedAt: video.publishedAt ?? undefined,
      artistId: artist?.id,
      artistName: artist?.name,
      artistNameKo: artist?.nameKo,
    };
  });
}

export type UnlinkedSpotifyTrack = {
  id: number;
  spotifyId: string;
  name: string;
  popularity: number;
  thumbnails: string[];
  releaseDate?: string;
  spotifyArtists: Array<{
    name: string;
    artistId?: number;
    artistNameKo?: string;
  }>;
};

export async function getUnlinkedSpotifyTracks(): Promise<
  UnlinkedSpotifyTrack[]
> {
  const tracks = await prisma.spotifyTrack.findMany({
    where: {
      songId: null, // Song과 연결되지 않은 트랙만 조회
      disabled: false,
      popularity: {
        not: null,
        gt: 0,
      },
      // 아티스트 ID가 MAX_ARTIST 이하인 트랙만 필터링
      artists: {
        some: {
          spotifyArtist: {
            artists: {
              some: {
                id: { lte: MAX_ARTIST },
              },
            },
          },
        },
      },
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
              artists: {
                where: {
                  id: { lte: MAX_ARTIST },
                },
                select: {
                  id: true,
                  name: true,
                  nameKo: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return tracks.map((track) => {
    // 스포티파이 아티스트별로 연결된 Artist 정보 추출
    const spotifyArtists = track.artists.map((a) => {
      const linkedArtist = a.spotifyArtist.artists[0]; // MAX_ARTIST 이하인 첫 번째 아티스트
      return {
        name: a.spotifyArtist.name,
        artistId: linkedArtist?.id,
        artistNameKo: linkedArtist?.nameKo,
      };
    });

    return {
      id: track.id,
      spotifyId: track.spotifyId,
      name: track.name,
      popularity: track.popularity ?? 0,
      thumbnails: track.thumbnails,
      releaseDate: track.releaseDate ?? undefined,
      spotifyArtists,
    };
  });
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
