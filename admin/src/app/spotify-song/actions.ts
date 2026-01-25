"use server";

import { prisma } from "@/lib/prisma";
import { MAX_ARTIST } from "@/lib/admin/z-param";
import { fetchYoutubeVideos } from "@/thirdparty/youtube/videos";

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
      songs: {
        none: {},
      },
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

export type AddYoutubeVideoResult =
  | { success: true; videoId: string; videoTitle?: string | null }
  | { success: false; error: string };

export async function addYoutubeVideoToSong(
  songId: number,
  rawUrl: string,
): Promise<AddYoutubeVideoResult> {
  const input = rawUrl?.trim();
  if (!input) {
    return { success: false, error: "유튜브 주소를 입력해주세요." };
  }

  const videoId = extractYoutubeVideoId(input);
  if (!videoId) {
    return {
      success: false,
      error: "유효한 YouTube/YouTube Music 주소를 입력해주세요.",
    };
  }

  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { id: true, youtubeVideoId: true },
  });
  if (!song) {
    return { success: false, error: "해당 곡을 찾을 수 없습니다." };
  }

  try {
    const response = await fetchYoutubeVideos([videoId]);
    const item = response.items?.[0];
    if (!item) {
      return {
        success: false,
        error: "YouTube 영상 정보를 찾을 수 없습니다.",
      };
    }

    const snippet = (item.snippet ?? {}) as Record<string, any>;
    const statistics = item.statistics ?? {};
    const videoData = {
      ownerChannelId:
        typeof snippet.channelId === "string" ? snippet.channelId : null,
      title: typeof snippet.title === "string" ? snippet.title : null,
      description:
        typeof snippet.description === "string" ? snippet.description : null,
      publishedAt: snippet.publishedAt
        ? new Date(snippet.publishedAt)
        : null,
      thumbnailDefault: getThumbnail(snippet, "default"),
      thumbnailMedium: getThumbnail(snippet, "medium"),
      thumbnailHigh: getThumbnail(snippet, "high"),
      thumbnailStandard: getThumbnail(snippet, "standard"),
      thumbnailMaxres: getThumbnail(snippet, "maxres"),
      viewCount: parseBigInt(statistics.viewCount),
      likeCount: parseNumber(statistics.likeCount),
      commentCount: parseNumber(statistics.commentCount),
    };

    await prisma.youtubeVideo.upsert({
      where: { videoId },
      update: videoData,
      create: {
        videoId,
        ...videoData,
      },
    });

    await prisma.songYoutubeVideo.upsert({
      where: {
        songId_youtubeVideoId: {
          songId,
          youtubeVideoId: videoId,
        },
      },
      update: {},
      create: {
        songId,
        youtubeVideoId: videoId,
      },
    });

    if (!song.youtubeVideoId) {
      await prisma.song.update({
        where: { id: songId },
        data: { youtubeVideoId: videoId },
      });
    }

    return { success: true, videoId, videoTitle: videoData.title };
  } catch (error) {
    console.error("YouTube 영상 생성/연결 실패:", error);
    return {
      success: false,
      error: "YouTube 영상 정보를 가져오는 중 오류가 발생했습니다.",
    };
  }
}

function extractYoutubeVideoId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const VIDEO_ID_REGEX = /^[\w-]{11}$/;
  if (VIDEO_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? trimmed
        : `https://${trimmed}`,
    );
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  if (host === "youtu.be") {
    const segments = parsed.pathname.split("/").filter(Boolean);
    const candidate = segments[0];
    if (candidate && VIDEO_ID_REGEX.test(candidate)) {
      return candidate;
    }
  }

  if (host.includes("youtube.com")) {
    const vParam = parsed.searchParams.get("v");
    if (vParam && VIDEO_ID_REGEX.test(vParam)) {
      return vParam;
    }
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] === "shorts" && segments[1] && VIDEO_ID_REGEX.test(segments[1])) {
      return segments[1];
    }
    if (segments[0] === "embed" && segments[1] && VIDEO_ID_REGEX.test(segments[1])) {
      return segments[1];
    }
  }

  return null;
}

function getThumbnail(snippet: Record<string, any>, size: string): string | null {
  const thumbnails = snippet.thumbnails as Record<string, any> | undefined;
  const value = thumbnails?.[size]?.url;
  return typeof value === "string" ? value : null;
}

function parseBigInt(value?: string): bigint | null {
  if (!value) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function parseNumber(value?: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
