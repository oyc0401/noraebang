"use server";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  type ManagerArtistDetail,
  type ManagerArtistInfo,
  type ManagerArtistSongDetail,
  type ManagerArtistSongsResult,
  type ManagerSpotifyPanelData,
  type ManagerSpotifyTrackSummary,
  type ManagerYoutubePanelData,
  type ManagerTjPanelData,
  type ManagerTjProposeSummary,
  type SongLinkedArtist,
} from "./types";

const spotifyTrackBaseSelect = {
  id: true,
  spotifyId: true,
  spotifyUrl: true,
  name: true,
  thumbnails: true,
  durationMs: true,
  releaseDate: true,
  popularity: true,
  musicBrainzTitle: true,
  musicBrainzArtistId: true,
  createdAt: true,
  artists: {
    select: {
      spotifyArtist: {
        select: {
          spotifyId: true,
          name: true,
          artists: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SpotifyTrackSelect;

function mapSpotifyTrackSummary(
  track: any,
  songId?: number | null,
): ManagerSpotifyTrackSummary {
  if (!track) {
    return {
      id: 0,
      spotifyId: "",
      name: "",
      spotifyUrl: null,
      durationMs: null,
      releaseDate: null,
      popularity: null,
      thumbnails: [],
      createdAt: "",
      songId: null,
      artists: [],
    };
  }
  return {
    id: track.id,
    spotifyId: track.spotifyId,
    name: track.name,
    spotifyUrl: track.spotifyUrl ?? null,
    durationMs: track.durationMs ?? null,
    releaseDate: track.releaseDate ?? null,
    popularity: track.popularity ?? null,
    musicBrainzTitle: track.musicBrainzTitle ?? null,
    musicBrainzArtistId: track.musicBrainzArtistId ?? null,
    thumbnails: track.thumbnails ?? [],
    createdAt:
      track.createdAt instanceof Date
        ? track.createdAt.toISOString()
        : String(track.createdAt ?? ""),
    songId: songId ?? null,
    artists:
      track.artists?.flatMap((link: any) => {
        const spotifyArtist = link.spotifyArtist;
        if (!spotifyArtist) {
          return [];
        }
        const linkedArtists = spotifyArtist.artists ?? [];
        if (!linkedArtists.length) {
          return [
            {
              artistId: null,
              spotifyName: spotifyArtist.name,
              spotifyId: spotifyArtist.spotifyId,
            },
          ];
        }
        return linkedArtists.map((artistRecord: any) => ({
          artistId: artistRecord.id,
          spotifyName: spotifyArtist.name,
          spotifyId: spotifyArtist.spotifyId,
        }));
      }) ?? [],
  };
}

export async function fetchManagerArtistDetail(
  artistId: number,
): Promise<ManagerArtistDetail | null> {
  if (!artistId || Number.isNaN(artistId)) {
    return null;
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      nameLatin: true,
      nameJa: true,
      nameJaKana: true,
      tjName: true,
      tjNameJa: true,
      slug: true,
      homeCatalog: true,
      spotifyId: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      spotifyArtist: {
        select: {
          name: true,
          popularity: true,
          followers: true,
          genres: true,
          spotifyUrl: true,
          thumbnails: true,
        },
      },
      artistSongs: {
        select: {
          song: {
            select: {
              id: true,
              title: true,
              titleKo: true,
              titleLatin: true,
              catalog: true,
              youtubeVideoId: true,
              thumbnailDefault: true,
              thumbnailMedium: true,
              thumbnailHigh: true,
              tjSong: {
                select: {
                  id: true,
                  title: true,
                  artist: true,
                },
              },
              songSpotifyTracks: {
                orderBy: { spotifyTrack: { popularity: "desc" } },
                select: {
                  spotifyTrack: {
                    select: spotifyTrackBaseSelect,
                  },
                },
              },
              karaokeSongs: {
                select: {
                  provider: true,
                  karaokeNo: true,
                },
              },
              artistSongs: {
                select: {
                  role: true,
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
                  youtubeVideo: {
                    select: {
                      videoId: true,
                      title: true,
                      viewCount: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      youtubeChannels: {
        orderBy: { type: "asc" },
        select: {
          id: true,
          type: true,
          channelId: true,
          title: true,
          subscriberCount: true,
          thumbnailDefault: true,
          thumbnailMedium: true,
          thumbnailHigh: true,
        },
      },
      _count: { select: { artistSongs: true } },
    },
  });

  if (!artist) {
    return null;
  }

  const songs = artist.artistSongs.map(({ song }) => {
    // 연결된 유튜브 비디오 중 조회수가 가장 높은 것 선택
    const sortedVideos = [...(song.youtubeVideos ?? [])].sort((a, b) => {
      const viewA = Number(a.youtubeVideo.viewCount ?? 0);
      const viewB = Number(b.youtubeVideo.viewCount ?? 0);
      return viewB - viewA;
    });
    const topVideo = sortedVideos[0]?.youtubeVideo ?? null;

    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      titleLatin: song.titleLatin,
      catalog: song.catalog,
      hasYoutube: sortedVideos.length > 0,
      youtubeVideoId: topVideo?.videoId ?? song.youtubeVideoId,
      topYoutubeVideo: topVideo
        ? {
            videoId: topVideo.videoId,
            title: topVideo.title,
            viewCount: topVideo.viewCount?.toString() ?? null,
          }
        : null,
      thumbnails: {
        default: song.thumbnailDefault,
        medium: song.thumbnailMedium,
        high: song.thumbnailHigh,
      },
      spotifyTracks:
        song.songSpotifyTracks?.map((sst: any) =>
          mapSpotifyTrackSummary(sst.spotifyTrack, song.id),
        ) ?? [],
      tjSong: song.tjSong
        ? {
            id: song.tjSong.id,
            title: song.tjSong.title,
            artist: song.tjSong.artist,
          }
        : null,
      karaoke: song.karaokeSongs.map((item) => ({
        provider: String(item.provider),
        karaokeNo: item.karaokeNo,
      })),
      artists: song.artistSongs.map((as) => ({
        id: as.artist.id,
        name: as.artist.name,
        nameKo: as.artist.nameKo,
        role: as.role ?? null,
      })),
    };
  });

  return {
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    nameLatin: artist.nameLatin,
    nameJa: artist.nameJa,
    nameJaKana: artist.nameJaKana,
    tjName: artist.tjName,
    tjNameJa: artist.tjNameJa,
    catalog: artist.homeCatalog,
    slug: artist.slug,
    spotifyId: artist.spotifyId,
    songCount: artist._count.artistSongs,
    thumbnails: {
      default: artist.thumbnailDefault,
      medium: artist.thumbnailMedium,
      high: artist.thumbnailHigh,
    },
    spotify: artist.spotifyArtist
      ? {
          name: artist.spotifyArtist.name,
          thumbnails: artist.spotifyArtist.thumbnails,
          popularity: artist.spotifyArtist.popularity,
          followers: artist.spotifyArtist.followers,
          genres: artist.spotifyArtist.genres ?? [],
          url: artist.spotifyArtist.spotifyUrl,
        }
      : null,
    youtubeChannels: artist.youtubeChannels.map((channel) => ({
      id: channel.id,
      type: channel.type,
      channelId: channel.channelId,
      title: channel.title,
      subscriberCount: channel.subscriberCount,
      thumbnails: {
        default: channel.thumbnailDefault,
        medium: channel.thumbnailMedium,
        high: channel.thumbnailHigh,
      },
    })),
    songs,
  };
}

// 아티스트 정보만 가져오기 (곡 목록 제외)
export async function fetchManagerArtistInfo(
  artistId: number,
): Promise<ManagerArtistInfo | null> {
  if (!artistId || Number.isNaN(artistId)) {
    return null;
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      nameLatin: true,
      nameJa: true,
      nameJaKana: true,

      tjName: true,
      tjNameJa: true,
      slug: true,
      homeCatalog: true,
      spotifyId: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      spotifyArtist: {
        select: {
          name: true,
          popularity: true,
          followers: true,
          genres: true,
          spotifyUrl: true,
          thumbnails: true,
        },
      },
      youtubeChannels: {
        orderBy: { type: "asc" },
        select: {
          id: true,
          type: true,
          channelId: true,
          title: true,
          subscriberCount: true,
          thumbnailDefault: true,
          thumbnailMedium: true,
          thumbnailHigh: true,
        },
      },
      _count: { select: { artistSongs: true } },
    },
  });

  if (!artist) {
    return null;
  }

  return {
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    nameLatin: artist.nameLatin,
    nameJa: artist.nameJa,
    nameJaKana: artist.nameJaKana,

    tjName: artist.tjName,
    tjNameJa: artist.tjNameJa,
    catalog: artist.homeCatalog,
    slug: artist.slug,
    spotifyId: artist.spotifyId,
    songCount: artist._count.artistSongs,
    thumbnails: {
      default: artist.thumbnailDefault,
      medium: artist.thumbnailMedium,
      high: artist.thumbnailHigh,
    },
    spotify: artist.spotifyArtist
      ? {
          name: artist.spotifyArtist.name,
          thumbnails: artist.spotifyArtist.thumbnails,
          popularity: artist.spotifyArtist.popularity,
          followers: artist.spotifyArtist.followers,
          genres: artist.spotifyArtist.genres ?? [],
          url: artist.spotifyArtist.spotifyUrl,
        }
      : null,
    youtubeChannels: artist.youtubeChannels.map((channel) => ({
      id: channel.id,
      type: channel.type,
      channelId: channel.channelId,
      title: channel.title,
      subscriberCount: channel.subscriberCount,
      thumbnails: {
        default: channel.thumbnailDefault,
        medium: channel.thumbnailMedium,
        high: channel.thumbnailHigh,
      },
    })),
  };
}

// 아티스트 곡 목록만 가져오기
export async function fetchManagerArtistSongs(
  artistId: number,
): Promise<ManagerArtistSongsResult | null> {
  if (!artistId || Number.isNaN(artistId)) {
    return null;
  }

  const artistSongs = await prisma.artistSong.findMany({
    where: { artistId },

    select: {
      song: {
        select: {
          id: true,
          title: true,
          titleKo: true,
          titleLatin: true,
          titleJa: true,
          titleJaKana: true,

          catalog: true,
          youtubeVideoId: true,
          thumbnailDefault: true,
          thumbnailMedium: true,
          thumbnailHigh: true,
          tjSong: {
            select: {
              id: true,
              title: true,
              artist: true,
            },
          },
          songSpotifyTracks: {
            orderBy: { spotifyTrack: { popularity: "desc" } },
            select: {
              spotifyTrack: {
                select: spotifyTrackBaseSelect,
              },
            },
          },
          karaokeSongs: {
            select: {
              provider: true,
              karaokeNo: true,
            },
          },
          artistSongs: {
            select: {
              role: true,
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
              youtubeVideo: {
                select: {
                  videoId: true,
                  title: true,
                  viewCount: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // TJSong이 없는 곡들의 ID를 모아서 신청곡 최대 hit 값 조회
  const songIdsWithoutTj = artistSongs
    .filter(({ song }) => !song.tjSong)
    .map(({ song }) => song.id);

  const maxProposeHitMap = new Map<number, number>();
  if (songIdsWithoutTj.length > 0) {
    const proposeMaxHits = await prisma.songPropose.groupBy({
      by: ["songId"],
      where: {
        songId: { in: songIdsWithoutTj },
      },
      _max: {
        hit: true,
      },
    });
    for (const item of proposeMaxHits) {
      if (item.songId && item._max.hit) {
        maxProposeHitMap.set(item.songId, item._max.hit);
      }
    }
  }

  const songs: ManagerArtistSongDetail[] = artistSongs.map(({ song }) => {
    const sortedVideos = [...(song.youtubeVideos ?? [])].sort((a, b) => {
      const viewA = Number(a.youtubeVideo.viewCount ?? 0);
      const viewB = Number(b.youtubeVideo.viewCount ?? 0);
      return viewB - viewA;
    });
    const topVideo = sortedVideos[0]?.youtubeVideo ?? null;

    return {
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      titleLatin: song.titleLatin,
      titleJa: song.titleJa,
      titleJaKana: song.titleJaKana,

      catalog: song.catalog,
      hasYoutube: sortedVideos.length > 0,
      youtubeVideoId: topVideo?.videoId ?? song.youtubeVideoId,
      topYoutubeVideo: topVideo
        ? {
            videoId: topVideo.videoId,
            title: topVideo.title,
            viewCount: topVideo.viewCount?.toString() ?? null,
          }
        : null,
      thumbnails: {
        default: song.thumbnailDefault,
        medium: song.thumbnailMedium,
        high: song.thumbnailHigh,
      },
      spotifyTracks:
        song.songSpotifyTracks?.map((sst: any) =>
          mapSpotifyTrackSummary(sst.spotifyTrack, song.id),
        ) ?? [],
      tjSong: song.tjSong
        ? {
            id: song.tjSong.id,
            title: song.tjSong.title,
            artist: song.tjSong.artist,
          }
        : null,
      maxProposeHit: maxProposeHitMap.get(song.id) ?? null,
      karaoke: song.karaokeSongs.map((item) => ({
        provider: String(item.provider),
        karaokeNo: item.karaokeNo,
      })),
      artists: song.artistSongs.map((as) => ({
        id: as.artist.id,
        name: as.artist.name,
        nameKo: as.artist.nameKo,
        role: as.role ?? null,
        order: as.order,
      })),
    };
  });

  return {
    artistId,
    songs,
  };
}

export async function fetchManagerArtistSpotifyPanel(
  artistId: number,
): Promise<ManagerSpotifyPanelData> {
  if (!artistId || Number.isNaN(artistId)) {
    return { groups: [], orphanTracks: [] };
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { spotifyId: true },
  });

  if (!artist?.spotifyId) {
    return { groups: [], orphanTracks: [] };
  }

  // 아티스트의 스포티파이 트랙 조회 (다대다 관계로 songs 포함)
  const artistTracks = await prisma.spotifyArtistTrack.findMany({
    where: { spotifyArtist: { spotifyId: artist.spotifyId } },
    select: {
      spotifyTrack: {
        select: {
          ...spotifyTrackBaseSelect,
          songs: {
            select: {
              song: {
                select: {
                  id: true,
                  title: true,
                  titleKo: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { spotifyTrack: { name: "asc" } },
  });

  // songId 기반으로 그룹화 (다대다: 첫 번째 연결된 Song 기준)
  const groupsAccumulator = new Map<
    number,
    {
      songId: number;
      linkedSong: { id: number; title: string; titleKo?: string | null };
      trackCount: number;
      artistTrackCount: number;
      primaryTrack: ManagerSpotifyTrackSummary | null;
      tracks: ManagerSpotifyTrackSummary[];
    }
  >();
  const orphanTracks: ManagerSpotifyTrackSummary[] = [];

  const mapTrack = (track: any): ManagerSpotifyTrackSummary =>
    mapSpotifyTrackSummary(track);

  for (const record of artistTracks) {
    const track = record.spotifyTrack;
    if (!track) continue;
    const summary = mapTrack(track);

    // 다대다: 첫 번째 연결된 Song을 사용
    const linkedSong = track.songs?.[0]?.song;
    if (linkedSong) {
      const songId = linkedSong.id;
      const existing = groupsAccumulator.get(songId);
      if (existing) {
        existing.artistTrackCount += 1;
        existing.trackCount += 1;
        existing.tracks.push(summary);
        // primaryTrack: 인기도가 더 높으면 교체
        if (
          existing.primaryTrack &&
          (summary.popularity ?? -1) > (existing.primaryTrack.popularity ?? -1)
        ) {
          existing.primaryTrack = summary;
        }
      } else {
        groupsAccumulator.set(songId, {
          songId,
          linkedSong: {
            id: linkedSong.id,
            title: linkedSong.title,
            titleKo: linkedSong.titleKo ?? undefined,
          },
          trackCount: 1,
          artistTrackCount: 1,
          primaryTrack: summary,
          tracks: [summary],
        });
      }
    } else {
      orphanTracks.push(summary);
    }
  }

  const groups = Array.from(groupsAccumulator.values())
    .filter((g) => g.primaryTrack !== null)
    .map((group) => ({
      songId: group.songId,
      trackCount: group.trackCount,
      artistTrackCount: group.artistTrackCount,
      primaryTrack: group.primaryTrack!,
      tracks: group.tracks,
      linkedSong: group.linkedSong,
    }))
    .sort((a, b) => {
      const popularityA = a.primaryTrack.popularity ?? -1;
      const popularityB = b.primaryTrack.popularity ?? -1;
      if (popularityA !== popularityB) {
        return popularityB - popularityA;
      }
      const dateA = a.primaryTrack.releaseDate ?? "";
      const dateB = b.primaryTrack.releaseDate ?? "";
      return dateB.localeCompare(dateA);
    });

  return {
    groups,
    orphanTracks: orphanTracks.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export type UpdateArtistNamesInput = {
  artistId: number;
  name: string;
  nameKo: string;
  nameJa?: string | null;
  nameJaKana?: string | null;

  nameLatin?: string | null;
  tjName?: string | null;
  tjNameJa?: string | null;
  slug?: string | null;
  catalog?: "미정" | "KPOP" | "JPOP" | "POP";
};

export async function updateArtistNames({
  artistId,
  name,
  nameKo,
  nameJa,
  nameJaKana,

  nameLatin,
  tjName,
  tjNameJa,
  slug,
  catalog,
}: UpdateArtistNamesInput) {
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }

  const sanitized = {
    name: name.trim(),
    nameKo: nameKo.trim(),
    nameJa: nameJa?.trim() || null,
    nameJaKana: nameJaKana?.trim() || null,

    nameLatin: nameLatin?.trim() || null,
    tjName: tjName?.trim() || null,
    tjNameJa: tjNameJa?.trim() || null,
    slug: slug?.trim() ? slug.trim() : null,
    homeCatalog:
      catalog && catalog !== "미정"
        ? catalog
        : catalog === "미정"
          ? null
          : undefined,
  };

  if (!sanitized.name || !sanitized.nameKo) {
    throw new Error("이름과 한국어 이름은 필수입니다.");
  }

  const data: Prisma.ArtistUpdateInput = {
    name: sanitized.name,
    nameKo: sanitized.nameKo,
    nameJa: sanitized.nameJa,
    nameJaKana: sanitized.nameJaKana,

    nameLatin: sanitized.nameLatin,
    tjName: sanitized.tjName,
    tjNameJa: sanitized.tjNameJa,
    slug: sanitized.slug,
  };
  if (sanitized.homeCatalog !== undefined) {
    data.homeCatalog = sanitized.homeCatalog;
  }

  const artist = await prisma.artist.update({
    where: { id: artistId },
    data,
    select: {
      id: true,
      name: true,
      nameKo: true,
      nameJa: true,
      nameJaKana: true,

      nameLatin: true,
      tjName: true,
      tjNameJa: true,
      slug: true,
      homeCatalog: true,
    },
  });

  return artist;
}

export type UpdateArtistSpotifyIdInput = {
  artistId: number;
  spotifyId?: string | null;
};

async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to get Spotify access token: ${response.statusText}`,
    );
  }

  const data: any = await response.json();
  return data.access_token;
}

async function fetchSpotifyArtistById(spotifyId: string) {
  const accessToken = await getSpotifyAccessToken();

  const response = await fetch(
    `https://api.spotify.com/v1/artists/${spotifyId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to get Spotify artist with ID "${spotifyId}": ${response.statusText}`,
    );
  }

  return (await response.json()) as {
    id: string;
    name: string;
    followers: { total: number };
    images: Array<{ url: string; height: number; width: number }>;
    genres: string[];
    popularity: number;
    external_urls: { spotify: string };
  };
}

export async function updateArtistSpotifyId({
  artistId,
  spotifyId,
}: UpdateArtistSpotifyIdInput) {
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }
  const value = spotifyId?.trim() ? spotifyId.trim() : null;

  // spotifyId가 있으면 SpotifyArtist 테이블에 먼저 upsert
  if (value) {
    const existingSpotifyArtist = await prisma.spotifyArtist.findUnique({
      where: { spotifyId: value },
      select: { id: true },
    });

    if (!existingSpotifyArtist) {
      // Spotify API에서 아티스트 정보 가져와서 생성
      const spotifyData = await fetchSpotifyArtistById(value);

      await prisma.spotifyArtist.create({
        data: {
          spotifyId: spotifyData.id,
          spotifyUrl: spotifyData.external_urls.spotify,
          name: spotifyData.name,
          popularity: spotifyData.popularity,
          followers: spotifyData.followers.total,
          genres: spotifyData.genres,
          thumbnails: spotifyData.images.map((img) => img.url),
        },
      });
    }
  }

  const artist = await prisma.artist.update({
    where: { id: artistId },
    data: { spotifyId: value },
    select: { id: true, spotifyId: true },
  });
  return artist;
}

export type AddYoutubeChannelInput = {
  artistId: number;
  channelId: string;
  type: "MAIN" | "TOPIC";
};

export async function addYoutubeChannel({
  artistId,
  channelId,
  type,
}: AddYoutubeChannelInput) {
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }
  const trimmedChannelId = channelId?.trim();
  if (!trimmedChannelId) {
    throw new Error("유효한 채널 ID가 필요합니다.");
  }

  // 이미 해당 타입의 채널이 연결되어 있는지 확인
  const existing = await prisma.youtubeChannel.findUnique({
    where: {
      artistId_type: {
        artistId,
        type,
      },
    },
    select: { id: true, channelId: true },
  });

  if (existing) {
    throw new Error(
      `이미 ${type} 타입의 채널이 연결되어 있습니다: ${existing.channelId}`,
    );
  }

  // YouTube Data API로 채널 정보 가져오기
  const channelInfo = await fetchYoutubeChannelInfo(trimmedChannelId);

  const channel = await prisma.youtubeChannel.create({
    data: {
      artistId,
      channelId: trimmedChannelId,
      type,
      title: channelInfo?.title,
      description: channelInfo?.description,
      customUrl: channelInfo?.customUrl,
      publishedAt: channelInfo?.publishedAt,
      thumbnailDefault: channelInfo?.thumbnailDefault,
      thumbnailMedium: channelInfo?.thumbnailMedium,
      thumbnailHigh: channelInfo?.thumbnailHigh,
      subscriberCount: channelInfo?.subscriberCount,
      videoCount: channelInfo?.videoCount,
      viewCount: channelInfo?.viewCount,
      hiddenSubscriberCount: channelInfo?.hiddenSubscriberCount,
      uploadsPlaylistId: channelInfo?.uploadsPlaylistId,
      fetchedAt: new Date(),
    },
    select: {
      id: true,
      channelId: true,
      type: true,
      title: true,
    },
  });

  return channel;
}

async function fetchYoutubeChannelInfo(channelId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn(
      "YOUTUBE_API_KEY가 설정되지 않아 채널 정보를 가져올 수 없습니다.",
    );
    return null;
  }

  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`YouTube API 호출 실패: ${response.statusText}`);
    return null;
  }

  const data: any = await response.json();
  const item = data.items?.[0];
  if (!item) {
    console.warn(`채널을 찾을 수 없습니다: ${channelId}`);
    return null;
  }

  const snippet = item.snippet;
  const statistics = item.statistics;
  const contentDetails = item.contentDetails;

  return {
    title: snippet?.title ?? null,
    description: snippet?.description ?? null,
    customUrl: snippet?.customUrl ?? null,
    publishedAt: snippet?.publishedAt ? new Date(snippet.publishedAt) : null,
    thumbnailDefault: snippet?.thumbnails?.default?.url ?? null,
    thumbnailMedium: snippet?.thumbnails?.medium?.url ?? null,
    thumbnailHigh: snippet?.thumbnails?.high?.url ?? null,
    subscriberCount: statistics?.subscriberCount
      ? Number.parseInt(statistics.subscriberCount, 10)
      : null,
    videoCount: statistics?.videoCount
      ? Number.parseInt(statistics.videoCount, 10)
      : null,
    viewCount: statistics?.viewCount ? BigInt(statistics.viewCount) : null,
    hiddenSubscriberCount: statistics?.hiddenSubscriberCount ?? null,
    uploadsPlaylistId: contentDetails?.relatedPlaylists?.uploads ?? null,
  };
}

export async function removeYoutubeChannel(channelId: number) {
  if (!channelId || Number.isNaN(channelId)) {
    throw new Error("유효한 채널 ID가 필요합니다.");
  }

  const deleted = await prisma.youtubeChannel.delete({
    where: { id: channelId },
    select: { id: true },
  });

  return deleted;
}

export async function deleteArtist(artistId: number) {
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }
  const deleted = await prisma.artist.delete({
    where: { id: artistId },
    select: { id: true },
  });
  return deleted;
}

export type MergeArtistInput = {
  sourceArtistId: number;
  targetArtistId: number;
};

export async function mergeArtist({
  sourceArtistId,
  targetArtistId,
}: MergeArtistInput) {
  if (
    !sourceArtistId ||
    Number.isNaN(sourceArtistId) ||
    !targetArtistId ||
    Number.isNaN(targetArtistId)
  ) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }
  if (sourceArtistId === targetArtistId) {
    throw new Error("동일한 아티스트로 병합할 수 없습니다.");
  }

  await prisma.$transaction(async (tx) => {
    const target = await tx.artist.findUnique({
      where: { id: targetArtistId },
      select: { id: true },
    });
    if (!target) {
      throw new Error("대상 아티스트를 찾을 수 없습니다.");
    }
    const source = await tx.artist.findUnique({
      where: { id: sourceArtistId },
      select: { id: true },
    });
    if (!source) {
      throw new Error("현재 아티스트를 찾을 수 없습니다.");
    }

    const artistSongs = await tx.artistSong.findMany({
      where: { artistId: sourceArtistId },
      select: { songId: true, role: true },
    });

    if (artistSongs.length > 0) {
      await tx.artistSong.createMany({
        data: artistSongs.map((song) => ({
          artistId: targetArtistId,
          songId: song.songId,

          role: song.role,
        })),
        skipDuplicates: true,
      });
    }

    await tx.artistSong.deleteMany({ where: { artistId: sourceArtistId } });
    await tx.artist.delete({ where: { id: sourceArtistId } });
  });

  return { merged: true };
}

export type ArtistAlias = {
  id: number;
  alias: string;
  locale: string;
  kind: string;
  source: string;
};

export async function fetchArtistAliases(
  artistId: number,
): Promise<ArtistAlias[]> {
  if (!artistId || Number.isNaN(artistId)) {
    return [];
  }

  const aliases = await prisma.artistAlias.findMany({
    where: { artistId },
    select: {
      id: true,
      alias: true,
      locale: true,
      kind: true,
      source: true,
    },
    orderBy: [{ locale: "asc" }, { kind: "asc" }, { alias: "asc" }],
  });

  return aliases;
}

// Union-Find for grouping videos by connected songs
class UnionFind {
  private parent = new Map<string, string>();

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
    }
    if (this.parent.get(x) !== x) {
      this.parent.set(x, this.find(this.parent.get(x)!));
    }
    return this.parent.get(x)!;
  }

  union(x: string, y: string): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX !== rootY) {
      this.parent.set(rootX, rootY);
    }
  }

  getGroups(items: string[]): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const item of items) {
      const root = this.find(item);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(item);
    }
    return groups;
  }
}

export async function fetchManagerArtistYoutubePanel(
  artistId: number,
): Promise<ManagerYoutubePanelData> {
  if (!artistId || Number.isNaN(artistId)) {
    return { channel: null, groups: [], orphanVideos: [] };
  }

  const topicChannel = await prisma.youtubeChannel.findFirst({
    where: { artistId, type: "TOPIC" },
    select: {
      id: true,
      channelId: true,
      title: true,
      thumbnailMedium: true,
      subscriberCount: true,
      videoCount: true,
    },
  });

  if (!topicChannel) {
    return { channel: null, groups: [], orphanVideos: [] };
  }

  // 채널의 비디오들 가져오기
  const channelVideos = await prisma.youtubeChannelVideo.findMany({
    where: { youtubeChannelId: topicChannel.id },
    select: {
      youtubeVideo: {
        select: {
          videoId: true,
          title: true,
          publishedAt: true,
          thumbnailMedium: true,
          thumbnailHigh: true,
          viewCount: true,
          likeCount: true,
          durationSeconds: true,
        },
      },
    },
    orderBy: { youtubeVideo: { publishedAt: "desc" } },
  });

  const videoIds = channelVideos.map((v) => v.youtubeVideo.videoId);
  const videoMap = new Map(
    channelVideos.map((v) => [
      v.youtubeVideo.videoId,
      {
        videoId: v.youtubeVideo.videoId,
        title: v.youtubeVideo.title,
        publishedAt: v.youtubeVideo.publishedAt?.toISOString() ?? null,
        thumbnailMedium: v.youtubeVideo.thumbnailMedium,
        thumbnailHigh: v.youtubeVideo.thumbnailHigh,
        viewCount: v.youtubeVideo.viewCount?.toString() ?? null,
        likeCount: v.youtubeVideo.likeCount,
        durationSeconds: v.youtubeVideo.durationSeconds,
      },
    ]),
  );

  // 아티스트의 Song들과 연결된 비디오 매핑 가져오기
  const songVideoMappings = await prisma.songYoutubeVideo.findMany({
    where: {
      youtubeVideoId: { in: videoIds },
      song: {
        artistSongs: {
          some: { artistId },
        },
      },
    },
    select: {
      songId: true,
      youtubeVideoId: true,
      song: {
        select: {
          id: true,
          title: true,
          titleKo: true,
          songSpotifyTracks: {
            orderBy: { spotifyTrack: { popularity: "desc" } },
            take: 1,
            select: { spotifyTrack: { select: { popularity: true } } },
          },
        },
      },
    },
  });

  // Song별 비디오들 그룹화
  const songToVideos = new Map<number, string[]>();
  const videoToSongs = new Map<string, Set<number>>();
  const songInfoMap = new Map<
    number,
    {
      id: number;
      title: string;
      titleKo: string | null;
      primaryPopularity: number | null;
    }
  >();

  for (const mapping of songVideoMappings) {
    // Song -> Videos
    if (!songToVideos.has(mapping.songId)) {
      songToVideos.set(mapping.songId, []);
    }
    songToVideos.get(mapping.songId)!.push(mapping.youtubeVideoId);

    // Video -> Songs
    if (!videoToSongs.has(mapping.youtubeVideoId)) {
      videoToSongs.set(mapping.youtubeVideoId, new Set());
    }
    videoToSongs.get(mapping.youtubeVideoId)!.add(mapping.songId);

    // Song info
    songInfoMap.set(mapping.songId, {
      id: mapping.song.id,
      title: mapping.song.title,
      titleKo: mapping.song.titleKo,
      primaryPopularity:
        mapping.song.songSpotifyTracks?.[0]?.spotifyTrack?.popularity ?? null,
    });
  }

  // Union-Find로 같은 Song에 연결된 비디오들 그룹화
  const uf = new UnionFind();
  const linkedVideoIds = new Set<string>();

  for (const [, videos] of songToVideos) {
    if (videos.length > 0) {
      const first = videos[0]!;
      linkedVideoIds.add(first);
      for (let i = 1; i < videos.length; i++) {
        linkedVideoIds.add(videos[i]!);
        uf.union(first, videos[i]!);
      }
    }
  }

  // 그룹 생성

  const groupsRaw: Array<{
    videos: Array<{
      videoId: string;
      title: string | null;
      publishedAt: string | null;
      thumbnailMedium: string | null;
      thumbnailHigh: string | null;
      viewCount: string | null;
      likeCount: number | null;
      durationSeconds: number | null;
    }>;
    linkedSongs: Array<{
      id: number;
      title: string;
      titleKo?: string | null;
      primaryPopularity: number | null;
    }>;
    sortPopularity: number; // 정렬용 (노출 안 해도 됨)
  }> = [];

  const videoGroups = uf.getGroups(Array.from(linkedVideoIds));
  for (const [, groupVideoIds] of videoGroups) {
    const linkedSongIds = new Set<number>();
    for (const videoId of groupVideoIds) {
      const songIds = videoToSongs.get(videoId);
      if (songIds) for (const songId of songIds) linkedSongIds.add(songId);
    }

    const linkedSongs = Array.from(linkedSongIds)
      .map((songId) => songInfoMap.get(songId)!)
      .filter(Boolean)
      .sort((a, b) => a.id - b.id);

    const videos = groupVideoIds
      .map((videoId) => videoMap.get(videoId)!)
      .filter(Boolean)
      .sort((a, b) => {
        const viewA = Number.parseInt(a.viewCount ?? "0", 10) || 0;
        const viewB = Number.parseInt(b.viewCount ?? "0", 10) || 0;
        if (viewA !== viewB) return viewB - viewA;

        const dateA = a.publishedAt ?? "";
        const dateB = b.publishedAt ?? "";
        return dateB.localeCompare(dateA);
      });

    const sortPopularity = linkedSongs.reduce((max, s) => {
      const p =
        typeof s.primaryPopularity === "number" ? s.primaryPopularity : -1;
      return Math.max(max, p);
    }, -1);

    groupsRaw.push({ videos, linkedSongs, sortPopularity });
  }

  // 그룹 정렬: linkedSongs 수 내림차순, 그 다음 videos 수 내림차순
  groupsRaw.sort((a, b) => {
    if (b.sortPopularity !== a.sortPopularity)
      return b.sortPopularity - a.sortPopularity;

    // tie-breaker (원하시면 바꾸셔도 됩니다)
    if (b.linkedSongs.length !== a.linkedSongs.length)
      return b.linkedSongs.length - a.linkedSongs.length;
    if (b.videos.length !== a.videos.length)
      return b.videos.length - a.videos.length;

    const dateA = a.videos[0]?.publishedAt ?? "";
    const dateB = b.videos[0]?.publishedAt ?? "";
    return dateB.localeCompare(dateA);
  });

  // orphan 비디오들 (매핑이 없는 비디오) - 조회수 많은 순 정렬
  const orphanVideos = videoIds
    .filter((videoId) => !linkedVideoIds.has(videoId))
    .map((videoId) => videoMap.get(videoId)!)
    .filter(Boolean)
    .sort((a, b) => {
      const viewA = Number(a.viewCount ?? 0);
      const viewB = Number(b.viewCount ?? 0);
      return viewB - viewA;
    });

  const groups = groupsRaw.map((g, idx) => ({
    groupIndex: idx + 1,
    videos: g.videos,
    linkedSongs: g.linkedSongs.map(({ primaryPopularity, ...rest }) => rest), // 노출 원치 않으면 제거
  }));

  return {
    channel: {
      id: topicChannel.id,
      channelId: topicChannel.channelId,
      title: topicChannel.title,
      thumbnailMedium: topicChannel.thumbnailMedium,
      subscriberCount: topicChannel.subscriberCount,
      videoCount: topicChannel.videoCount,
    },
    groups,
    orphanVideos,
  };
}

export type UpdateSongInput = {
  songId: number;
  title?: string;
  titleKo?: string;
  titleLatin?: string;
  titleJa?: string | null;
  titleJaKana?: string | null;
  catalog?: string;
  youtubeVideoId?: string;
};

export async function updateSong(input: UpdateSongInput) {
  const { songId, ...data } = input;

  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }

  const sanitizedData = {
    title: data.title?.trim(),
    titleKo: data.titleKo?.trim(),
    titleLatin: data.titleLatin?.trim() || null,
    titleJa: data.titleJa?.trim() || null,
    titleJaKana: data.titleJaKana?.trim() || null,

    catalog: data.catalog?.trim() || null,
    youtubeVideoId: data.youtubeVideoId?.trim() || null,
  };

  const updatedSong = await prisma.song.update({
    where: { id: songId },
    data: sanitizedData,
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJa: true,
      titleJaKana: true,

      catalog: true,
      youtubeVideoId: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      tjSong: {
        select: {
          id: true,
          title: true,
          artist: true,
        },
      },
      songSpotifyTracks: {
        orderBy: { spotifyTrack: { popularity: "desc" } },
        select: {
          spotifyTrack: {
            select: spotifyTrackBaseSelect,
          },
        },
      },
      karaokeSongs: {
        select: {
          provider: true,
          karaokeNo: true,
        },
      },
    },
  });

  // 아티스트 정보도 다시 가져와서 반환
  const songWithArtists = await prisma.song.findUnique({
    where: { id: songId },
    select: {
      artistSongs: {
        select: {
          role: true,
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
  });

  return {
    id: updatedSong.id,
    title: updatedSong.title,
    titleKo: updatedSong.titleKo,
    titleLatin: updatedSong.titleLatin,
    titleJa: updatedSong.titleJa,
    titleJaKana: updatedSong.titleJaKana,

    catalog: updatedSong.catalog,
    hasYoutube: Boolean(updatedSong.youtubeVideoId),
    youtubeVideoId: updatedSong.youtubeVideoId,
    thumbnails: {
      default: updatedSong.thumbnailDefault,
      medium: updatedSong.thumbnailMedium,
      high: updatedSong.thumbnailHigh,
    },
    spotifyTracks:
      updatedSong.songSpotifyTracks?.map((sst: any) =>
        mapSpotifyTrackSummary(sst.spotifyTrack, updatedSong.id),
      ) ?? [],
    tjSong: updatedSong.tjSong
      ? {
          id: updatedSong.tjSong.id,
          title: updatedSong.tjSong.title,
          artist: updatedSong.tjSong.artist,
        }
      : null,
    karaoke: updatedSong.karaokeSongs.map((item) => ({
      provider: String(item.provider),
      karaokeNo: item.karaokeNo,
    })),
    artists:
      songWithArtists?.artistSongs.map((as) => ({
        id: as.artist.id,
        name: as.artist.name,
        nameKo: as.artist.nameKo,
        role: as.role ?? null,
      })) ?? [],
  };
}

// 곡 삭제
export async function deleteSong(songId: number): Promise<void> {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }

  // 연결된 데이터 삭제 (cascade가 아닌 경우 수동으로 삭제)
  await prisma.$transaction(async (tx) => {
    // ArtistSong 연결 삭제
    await tx.artistSong.deleteMany({ where: { songId } });

    // SongYoutubeVideo 연결 삭제
    await tx.songYoutubeVideo.deleteMany({ where: { songId } });

    // SongSpotifyTrack 연결 삭제 (다대다)
    await tx.songSpotifyTrack.deleteMany({ where: { songId } });

    // KaraokeSong 연결 삭제
    await tx.karaokeSong.deleteMany({ where: { songId } });

    // SongAlias 삭제
    await tx.songAlias.deleteMany({ where: { songId } });

    // SongPropose의 songId를 null로 설정
    await tx.songPropose.updateMany({
      where: { songId },
      data: { songId: null },
    });

    // 곡 삭제
    await tx.song.delete({ where: { id: songId } });
  });
}

// 곡에 연결된 아티스트 목록 조회
export async function fetchSongArtists(
  songId: number,
): Promise<SongLinkedArtist[]> {
  if (!songId || Number.isNaN(songId)) {
    return [];
  }

  const artistSongs = await prisma.artistSong.findMany({
    where: { songId },

    select: {
      role: true,
      artist: {
        select: {
          id: true,
          name: true,
          nameKo: true,
        },
      },
    },
  });

  return artistSongs.map((as) => ({
    id: as.artist.id,
    name: as.artist.name,
    nameKo: as.artist.nameKo,
    role: as.role ?? null,
  }));
}

// 아티스트 검색 (곡에 연결할 아티스트 찾기용)
export async function searchArtistsForLink(
  searchTerm: string,
  limit = 20,
): Promise<Array<{ id: number; name: string; nameKo: string }>> {
  const trimmed = searchTerm.trim();
  if (!trimmed) {
    return [];
  }

  const isNumericSearch = /^\d+$/.test(trimmed);

  const artists = await prisma.artist.findMany({
    where: isNumericSearch
      ? { id: Number(trimmed) }
      : {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { nameKo: { contains: trimmed, mode: "insensitive" } },
            { nameLatin: { contains: trimmed, mode: "insensitive" } },
            { nameJaKana: { contains: trimmed, mode: "insensitive" } },
          ],
        },
    take: limit,
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      nameKo: true,
    },
  });

  return artists;
}

// 곡에 아티스트 연결
export type LinkSongArtistInput = {
  songId: number;
  artistId: number;
  role?: "MAIN" | "FEATURING" | "PRODUCER" | null;
};

export async function linkSongArtist({
  songId,
  artistId,
  role,
}: LinkSongArtistInput): Promise<SongLinkedArtist[]> {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }

  // 이미 연결된지 확인
  const existing = await prisma.artistSong.findUnique({
    where: {
      artistId_songId: { artistId, songId },
    },
  });

  if (existing) {
    throw new Error("이미 연결된 아티스트입니다.");
  }

  // 현재 가장 높은 order 값 찾기
  await prisma.artistSong.create({
    data: {
      songId,
      artistId,

      role: role ?? null,
    },
  });

  return fetchSongArtists(songId);
}

// 곡에서 아티스트 연결 해제
export type UnlinkSongArtistInput = {
  songId: number;
  artistId: number;
};

export async function unlinkSongArtist({
  songId,
  artistId,
}: UnlinkSongArtistInput): Promise<SongLinkedArtist[]> {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }

  await prisma.artistSong.delete({
    where: {
      artistId_songId: { artistId, songId },
    },
  });

  return fetchSongArtists(songId);
}

export async function fetchManagerArtistTjPanel(
  artistId: number,
): Promise<ManagerTjPanelData> {
  if (!artistId || Number.isNaN(artistId)) {
    return {
      tjName: null,
      tjNameJa: null,
      groups: [],
      orphanProposes: [],
      totalCount: 0,
      lastUpdatedAt: null,
    };
  }

  // 아티스트의 tjName, tjNameJa 가져오기
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { tjName: true, tjNameJa: true },
  });

  if (!artist?.tjName && !artist?.tjNameJa) {
    return {
      tjName: null,
      tjNameJa: null,
      groups: [],
      orphanProposes: [],
      totalCount: 0,
      lastUpdatedAt: null,
    };
  }

  const singerNames: string[] = [];
  if (artist.tjName) singerNames.push(artist.tjName);
  if (artist.tjNameJa) singerNames.push(artist.tjNameJa);

  // 해당 가수명으로 된 SongPropose 조회 (query 필드로 검색)
  const proposes = await prisma.songPropose.findMany({
    where: {
      query: { in: singerNames },
    },
    select: {
      id: true,
      songTitle: true,
      songSinger: true,
      hit: true,
      regdateView: true,
      songId: true,
      updateDate: true,
      song: {
        select: {
          id: true,
          title: true,
          titleKo: true,
        },
      },
    },
    orderBy: { hit: "desc" },
  });

  // 가장 최근 업데이트된 신청곡의 updateDate
  const lastUpdatedAt =
    proposes.length > 0
      ? Math.max(...proposes.map((p) => Number(p.updateDate)))
      : null;

  // songId로 그룹화 (songId가 있는 것들)
  const groupedBySongId = new Map<
    number,
    {
      proposes: ManagerTjProposeSummary[];
      linkedSong: { id: number; title: string; titleKo?: string | null };
      maxHit: number;
    }
  >();
  const orphanProposes: ManagerTjProposeSummary[] = [];

  for (const propose of proposes) {
    const summary: ManagerTjProposeSummary = {
      id: propose.id,
      songTitle: propose.songTitle,
      songSinger: propose.songSinger,
      hit: propose.hit,
      regdateView: propose.regdateView,
      songId: propose.songId,
      linkedSong: propose.song
        ? {
            id: propose.song.id,
            title: propose.song.title,
            titleKo: propose.song.titleKo ?? undefined,
          }
        : null,
    };

    if (propose.songId && propose.song) {
      const existing = groupedBySongId.get(propose.songId);
      if (existing) {
        existing.proposes.push(summary);
        existing.maxHit = Math.max(existing.maxHit, propose.hit);
      } else {
        groupedBySongId.set(propose.songId, {
          proposes: [summary],
          linkedSong: {
            id: propose.song.id,
            title: propose.song.title,
            titleKo: propose.song.titleKo ?? undefined,
          },
          maxHit: propose.hit,
        });
      }
    } else {
      orphanProposes.push(summary);
    }
  }

  // 그룹 배열로 변환하고 maxHit 기준 내림차순 정렬
  const groupsArray = Array.from(groupedBySongId.values())
    .sort((a, b) => b.maxHit - a.maxHit)
    .map((group, idx) => ({
      groupIndex: idx + 1,
      proposes: group.proposes.sort((a, b) => b.hit - a.hit),
      maxHit: group.maxHit,
      linkedSong: group.linkedSong,
    }));

  return {
    tjName: artist.tjName,
    tjNameJa: artist.tjNameJa,
    groups: groupsArray,
    orphanProposes: orphanProposes.sort((a, b) => b.hit - a.hit),
    totalCount: proposes.length,
    lastUpdatedAt,
  };
}

// 곡 생성 및 아티스트 연결
export type CreateSongInput = {
  title: string;
  titleKo?: string;
  titleLatin?: string;
  titleJa?: string;
  titleJaKana?: string;

  catalog?: string;
  artistId: number; // 연결할 아티스트 ID
};

export async function createSong({
  title,
  titleKo,
  titleLatin,
  titleJa,
  titleJaKana,

  catalog,
  artistId,
}: CreateSongInput): Promise<ManagerArtistSongDetail> {
  if (!title.trim()) {
    throw new Error("곡 제목은 필수입니다.");
  }
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }

  const song = await prisma.song.create({
    data: {
      title: title.trim(),
      titleKo: titleKo?.trim() || null,
      titleLatin: titleLatin?.trim() || null,
      titleJa: titleJa?.trim() || null,
      titleJaKana: titleJaKana?.trim() || null,

      catalog: catalog?.trim() || null,
      artistSongs: {
        create: {
          artistId,
        },
      },
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJa: true,
      titleJaKana: true,

      catalog: true,
      youtubeVideoId: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      tjSong: {
        select: {
          id: true,
          title: true,
          artist: true,
        },
      },
      songSpotifyTracks: {
        orderBy: { spotifyTrack: { popularity: "desc" } },
        select: {
          spotifyTrack: {
            select: spotifyTrackBaseSelect,
          },
        },
      },
      karaokeSongs: {
        select: {
          provider: true,
          karaokeNo: true,
        },
      },
      artistSongs: {
        select: {
          role: true,
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
          youtubeVideo: {
            select: {
              videoId: true,
              title: true,
              viewCount: true,
            },
          },
        },
      },
    },
  });

  const sortedVideos = [...(song.youtubeVideos ?? [])].sort((a, b) => {
    const viewA = Number(a.youtubeVideo.viewCount ?? 0);
    const viewB = Number(b.youtubeVideo.viewCount ?? 0);
    return viewB - viewA;
  });
  const topVideo = sortedVideos[0]?.youtubeVideo ?? null;

  return {
    id: song.id,
    title: song.title,
    titleKo: song.titleKo,
    titleLatin: song.titleLatin,
    titleJa: song.titleJa,
    titleJaKana: song.titleJaKana,

    catalog: song.catalog,
    hasYoutube: sortedVideos.length > 0,
    youtubeVideoId: topVideo?.videoId ?? song.youtubeVideoId,
    topYoutubeVideo: topVideo
      ? {
          videoId: topVideo.videoId,
          title: topVideo.title,
          viewCount: topVideo.viewCount?.toString() ?? null,
        }
      : null,
    thumbnails: {
      default: song.thumbnailDefault,
      medium: song.thumbnailMedium,
      high: song.thumbnailHigh,
    },
    spotifyTracks:
      song.songSpotifyTracks?.map((sst: any) =>
        mapSpotifyTrackSummary(sst.spotifyTrack, song.id),
      ) ?? [],
    tjSong: song.tjSong
      ? {
          id: song.tjSong.id,
          title: song.tjSong.title,
          artist: song.tjSong.artist,
        }
      : null,
    maxProposeHit: null,
    karaoke: song.karaokeSongs.map((item) => ({
      provider: String(item.provider),
      karaokeNo: item.karaokeNo,
    })),
    artists: song.artistSongs.map((as) => ({
      id: as.artist.id,
      name: as.artist.name,
      nameKo: as.artist.nameKo,
      role: as.role ?? null,
    })),
  };
}

// ========== 곡 편집용 미연결 데이터 조회 ==========

// 아티스트의 미연결 유튜브 비디오 조회
export type UnlinkedYoutubeVideo = {
  videoId: string;
  title: string | null;
  viewCount: string | null;
  thumbnailMedium: string | null;
};

export async function fetchUnlinkedYoutubeVideos(
  artistId: number,
): Promise<UnlinkedYoutubeVideo[]> {
  if (!artistId || Number.isNaN(artistId)) {
    return [];
  }

  // 아티스트의 TOPIC 채널 가져오기
  const topicChannel = await prisma.youtubeChannel.findFirst({
    where: { artistId, type: "TOPIC" },
    select: { id: true },
  });

  if (!topicChannel) {
    return [];
  }

  // 채널의 모든 비디오 가져오기
  const channelVideos = await prisma.youtubeChannelVideo.findMany({
    where: { youtubeChannelId: topicChannel.id },
    select: {
      youtubeVideo: {
        select: {
          videoId: true,
          title: true,
          viewCount: true,
          thumbnailMedium: true,
        },
      },
    },
  });

  // 이미 Song에 연결된 비디오 ID들 가져오기
  const linkedVideoIds = await prisma.songYoutubeVideo.findMany({
    where: {
      song: { artistSongs: { some: { artistId } } },
    },
    select: { youtubeVideoId: true },
  });
  const linkedSet = new Set(linkedVideoIds.map((v) => v.youtubeVideoId));

  // 미연결 비디오 필터링
  return channelVideos
    .filter((cv) => !linkedSet.has(cv.youtubeVideo.videoId))
    .map((cv) => ({
      videoId: cv.youtubeVideo.videoId,
      title: cv.youtubeVideo.title,
      viewCount: cv.youtubeVideo.viewCount?.toString() ?? null,
      thumbnailMedium: cv.youtubeVideo.thumbnailMedium,
    }))
    .sort((a, b) => {
      const viewA = Number(a.viewCount ?? 0);
      const viewB = Number(b.viewCount ?? 0);
      return viewB - viewA;
    });
}

// 아티스트의 미연결 신청곡 조회
export type UnlinkedSongPropose = {
  id: number;
  songTitle: string;
  songSinger: string;
  hit: number;
  regdateView: string;
};

export async function fetchUnlinkedSongProposes(
  artistId: number,
): Promise<UnlinkedSongPropose[]> {
  if (!artistId || Number.isNaN(artistId)) {
    return [];
  }

  // 아티스트의 tjName, tjNameJa 가져오기
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { tjName: true, tjNameJa: true },
  });

  if (!artist?.tjName && !artist?.tjNameJa) {
    return [];
  }

  const singerNames: string[] = [];
  if (artist.tjName) singerNames.push(artist.tjName);
  if (artist.tjNameJa) singerNames.push(artist.tjNameJa);

  // 해당 가수의 미연결 신청곡 조회 (query 필드로 검색)
  const proposes = await prisma.songPropose.findMany({
    where: {
      query: { in: singerNames },
      songId: null, // 미연결만
    },
    select: {
      id: true,
      songTitle: true,
      songSinger: true,
      hit: true,
      regdateView: true,
    },
    orderBy: { hit: "desc" },
  });

  return proposes;
}

// 곡에 연결된 유튜브 비디오 조회
export type LinkedYoutubeVideo = {
  videoId: string;
  title: string | null;
  viewCount: string | null;
  thumbnailMedium: string | null;
};

export async function fetchLinkedYoutubeVideos(
  songId: number,
): Promise<LinkedYoutubeVideo[]> {
  if (!songId || Number.isNaN(songId)) {
    return [];
  }

  const links = await prisma.songYoutubeVideo.findMany({
    where: { songId },
    select: {
      youtubeVideo: {
        select: {
          videoId: true,
          title: true,
          viewCount: true,
          thumbnailMedium: true,
        },
      },
    },
  });

  return links.map((l) => ({
    videoId: l.youtubeVideo.videoId,
    title: l.youtubeVideo.title,
    viewCount: l.youtubeVideo.viewCount?.toString() ?? null,
    thumbnailMedium: l.youtubeVideo.thumbnailMedium,
  }));
}

// 곡에 연결된 신청곡 조회
export type LinkedSongPropose = {
  id: number;
  songTitle: string;
  songSinger: string;
  hit: number;
  regdateView: string;
};

export async function fetchLinkedSongProposes(
  songId: number,
): Promise<LinkedSongPropose[]> {
  if (!songId || Number.isNaN(songId)) {
    return [];
  }

  const proposes = await prisma.songPropose.findMany({
    where: { songId },
    select: {
      id: true,
      songTitle: true,
      songSinger: true,
      hit: true,
      regdateView: true,
    },
    orderBy: { hit: "desc" },
  });

  return proposes;
}

// ========== 연결/해제 함수들 ==========

// 스포티파이 트랙 연결 (다대다 관계)
export async function linkSpotifyTrack(songId: number, trackId: number) {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!trackId || Number.isNaN(trackId)) {
    throw new Error("유효한 트랙 ID가 필요합니다.");
  }

  // 이미 연결되어 있는지 확인
  const existing = await prisma.songSpotifyTrack.findUnique({
    where: {
      songId_spotifyTrackId: { songId, spotifyTrackId: trackId },
    },
  });

  if (existing) {
    throw new Error("이미 연결된 트랙입니다.");
  }

  await prisma.songSpotifyTrack.create({
    data: { songId, spotifyTrackId: trackId },
  });

  return { success: true };
}

// 스포티파이 트랙 연결 해제 (다대다 관계)
export async function unlinkSpotifyTrack(trackId: number, songId?: number) {
  if (!trackId || Number.isNaN(trackId)) {
    throw new Error("유효한 트랙 ID가 필요합니다.");
  }

  if (songId) {
    // 특정 곡과의 연결만 해제
    await prisma.songSpotifyTrack.deleteMany({
      where: { spotifyTrackId: trackId, songId },
    });
  } else {
    // 모든 곡과의 연결 해제
    await prisma.songSpotifyTrack.deleteMany({
      where: { spotifyTrackId: trackId },
    });
  }

  return { success: true };
}

// 곡의 모든 스포티파이 트랙 연결 해제 (다대다 관계)
export async function unlinkAllSpotifyTracks(songId: number) {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }

  await prisma.songSpotifyTrack.deleteMany({
    where: { songId },
  });

  return { success: true };
}

// 유튜브 비디오 연결
export async function linkYoutubeVideo(songId: number, videoId: string) {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!videoId) {
    throw new Error("유효한 비디오 ID가 필요합니다.");
  }

  // 이미 연결되어 있는지 확인
  const existing = await prisma.songYoutubeVideo.findFirst({
    where: { songId, youtubeVideoId: videoId },
  });

  if (existing) {
    throw new Error("이미 연결된 비디오입니다.");
  }

  await prisma.songYoutubeVideo.create({
    data: { songId, youtubeVideoId: videoId },
  });

  return { success: true };
}

// YouTube Data API로 비디오 정보 가져오기
async function fetchYoutubeVideoInfo(videoId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY가 설정되지 않았습니다.");
  }

  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API 호출 실패: ${response.statusText}`);
  }

  const data: any = await response.json();
  const item = data.items?.[0];
  if (!item) {
    throw new Error(`비디오를 찾을 수 없습니다: ${videoId}`);
  }

  const snippet = item.snippet;
  const statistics = item.statistics;
  const contentDetails = item.contentDetails;

  // ISO 8601 duration을 초로 변환 (PT1H2M3S -> 3723)
  const durationStr = contentDetails?.duration ?? "";
  let durationSeconds: number | null = null;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (match) {
    const hours = Number.parseInt(match[1] ?? "0", 10);
    const minutes = Number.parseInt(match[2] ?? "0", 10);
    const seconds = Number.parseInt(match[3] ?? "0", 10);
    durationSeconds = hours * 3600 + minutes * 60 + seconds;
  }

  return {
    videoId,
    ownerChannelId: snippet?.channelId ?? null,
    title: snippet?.title ?? null,
    description: snippet?.description ?? null,
    publishedAt: snippet?.publishedAt ? new Date(snippet.publishedAt) : null,
    thumbnailDefault: snippet?.thumbnails?.default?.url ?? null,
    thumbnailMedium: snippet?.thumbnails?.medium?.url ?? null,
    thumbnailHigh: snippet?.thumbnails?.high?.url ?? null,
    thumbnailStandard: snippet?.thumbnails?.standard?.url ?? null,
    thumbnailMaxres: snippet?.thumbnails?.maxres?.url ?? null,
    viewCount: statistics?.viewCount ? BigInt(statistics.viewCount) : null,
    likeCount: statistics?.likeCount
      ? Number.parseInt(statistics.likeCount, 10)
      : null,
    commentCount: statistics?.commentCount
      ? Number.parseInt(statistics.commentCount, 10)
      : null,
    durationSeconds,
    definition: contentDetails?.definition ?? null,
    caption: contentDetails?.caption === "true",
    fetchedAt: new Date(),
  };
}

// 유튜브 비디오 생성 후 곡에 연결
export async function createAndLinkYoutubeVideo(
  songId: number,
  videoId: string,
): Promise<LinkedYoutubeVideo> {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }

  const trimmedVideoId = videoId?.trim();
  if (!trimmedVideoId) {
    throw new Error("유효한 비디오 ID가 필요합니다.");
  }

  // 이미 존재하는 비디오인지 확인
  const existingVideo = await prisma.youtubeVideo.findUnique({
    where: { videoId: trimmedVideoId },
  });

  if (existingVideo) {
    // 이미 연결되어 있는지 확인
    const existingLink = await prisma.songYoutubeVideo.findFirst({
      where: { songId, youtubeVideoId: trimmedVideoId },
    });

    if (existingLink) {
      throw new Error("이미 연결된 비디오입니다.");
    }

    // 연결만 생성
    await prisma.songYoutubeVideo.create({
      data: { songId, youtubeVideoId: trimmedVideoId },
    });

    return {
      videoId: existingVideo.videoId,
      title: existingVideo.title,
      thumbnailMedium: existingVideo.thumbnailMedium,
      viewCount: existingVideo.viewCount?.toString() ?? null,
    };
  }

  // YouTube API에서 비디오 정보 가져오기
  const videoInfo = await fetchYoutubeVideoInfo(trimmedVideoId);

  // 비디오 생성
  const newVideo = await prisma.youtubeVideo.create({
    data: videoInfo,
  });

  // 곡에 연결
  await prisma.songYoutubeVideo.create({
    data: { songId, youtubeVideoId: trimmedVideoId },
  });

  return {
    videoId: newVideo.videoId,
    title: newVideo.title,
    thumbnailMedium: newVideo.thumbnailMedium,
    viewCount: newVideo.viewCount?.toString() ?? null,
  };
}

// 유튜브 비디오 연결 해제
export async function unlinkYoutubeVideo(songId: number, videoId: string) {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!videoId) {
    throw new Error("유효한 비디오 ID가 필요합니다.");
  }

  await prisma.songYoutubeVideo.deleteMany({
    where: { songId, youtubeVideoId: videoId },
  });

  return { success: true };
}

// 신청곡 연결
export async function linkSongPropose(songId: number, proposeId: number) {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!proposeId || Number.isNaN(proposeId)) {
    throw new Error("유효한 신청곡 ID가 필요합니다.");
  }

  await prisma.songPropose.update({
    where: { id: proposeId },
    data: { songId },
  });

  return { success: true };
}

// 신청곡 연결 해제
export async function unlinkSongPropose(proposeId: number) {
  if (!proposeId || Number.isNaN(proposeId)) {
    throw new Error("유효한 신청곡 ID가 필요합니다.");
  }

  await prisma.songPropose.update({
    where: { id: proposeId },
    data: { songId: null },
  });

  return { success: true };
}

// ========== 썸네일 새로고침 ==========

export type RefreshThumbnailResult = {
  source: "spotify" | "youtube" | null;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
};

// 썸네일 새로고침 (스포티파이: 가장 오래된 발매일, 유튜브: 가장 높은 조회수)
export async function refreshSongThumbnail(
  songId: number,
  source: "spotify" | "youtube",
): Promise<RefreshThumbnailResult> {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }

  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: {
      songSpotifyTracks: {
        orderBy: { spotifyTrack: { releaseDate: "asc" } },
        take: 1,
        select: { spotifyTrack: { select: { thumbnails: true } } },
      },
      youtubeVideos: {
        select: {
          youtubeVideo: {
            select: {
              videoId: true,
              viewCount: true,
              thumbnailDefault: true,
              thumbnailMedium: true,
              thumbnailHigh: true,
            },
          },
        },
      },
    },
  });

  if (!song) {
    throw new Error("곡을 찾을 수 없습니다.");
  }

  let thumbnailDefault: string | null = null;
  let thumbnailMedium: string | null = null;
  let thumbnailHigh: string | null = null;
  let actualSource: "spotify" | "youtube" | null = null;

  if (source === "spotify" && song.songSpotifyTracks.length > 0) {
    // 스포티파이 트랙 중 가장 오래된 발매일의 썸네일 가져오기
    const oldestTrack = song.songSpotifyTracks[0]?.spotifyTrack;

    if (oldestTrack?.thumbnails?.length) {
      // Spotify 썸네일은 배열로 저장됨 (보통 3개: 640, 300, 64)
      const thumbs = oldestTrack.thumbnails;
      thumbnailHigh = thumbs[0] ?? null;
      thumbnailMedium = thumbs[1] ?? thumbs[0] ?? null;
      thumbnailDefault = thumbs[2] ?? thumbs[1] ?? thumbs[0] ?? null;
      actualSource = "spotify";
    }
  } else if (source === "youtube" && song.youtubeVideos.length > 0) {
    // 유튜브 비디오 중 가장 조회수가 높은 것의 썸네일
    const sortedVideos = [...song.youtubeVideos].sort((a, b) => {
      const viewA = Number(a.youtubeVideo.viewCount ?? 0);
      const viewB = Number(b.youtubeVideo.viewCount ?? 0);
      return viewB - viewA;
    });

    const topVideo = sortedVideos[0]?.youtubeVideo;
    if (topVideo) {
      thumbnailDefault = topVideo.thumbnailDefault;
      thumbnailMedium = topVideo.thumbnailMedium;
      thumbnailHigh = topVideo.thumbnailHigh;
      actualSource = "youtube";
    }
  }

  if (!actualSource) {
    throw new Error(
      `${source === "spotify" ? "스포티파이" : "유튜브"} 썸네일을 찾을 수 없습니다.`,
    );
  }

  // 썸네일 업데이트
  await prisma.song.update({
    where: { id: songId },
    data: {
      thumbnailDefault,
      thumbnailMedium,
      thumbnailHigh,
    },
  });

  return {
    source: actualSource,
    thumbnailDefault,
    thumbnailMedium,
    thumbnailHigh,
  };
}

// ========== TJ 신청곡 수집/매핑 ==========

import { fetchProposeForArtist } from "@/lib/admin/refresh/fetch-propose-for-artist";
import { mapProposeSong } from "@/lib/admin/mapping/map-propose-song";

export async function runFetchProposeForArtist(artistId: number) {
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }
  return fetchProposeForArtist(artistId);
}

export async function runMapProposeSong(artistId: number) {
  if (!artistId || Number.isNaN(artistId)) {
    throw new Error("유효한 아티스트 ID가 필요합니다.");
  }
  return mapProposeSong(artistId);
}

// Song에 연결되지 않은 스포티파이 트랙 가져오기 (orphan tracks)
export type UnlinkedSpotifyTrack = {
  id: number;
  name: string;
  spotifyId: string;
  popularity: number | null;
  thumbnails: string[];
};

export async function fetchUnlinkedSpotifyTracks(
  artistId: number,
): Promise<UnlinkedSpotifyTrack[]> {
  if (!artistId || Number.isNaN(artistId)) {
    return [];
  }

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { spotifyId: true },
  });

  if (!artist?.spotifyId) {
    return [];
  }

  // 아티스트의 모든 스포티파이 트랙 중 Song에 연결되지 않은 것들 (다대다)
  const artistTracks = await prisma.spotifyArtistTrack.findMany({
    where: { spotifyArtist: { spotifyId: artist.spotifyId } },
    select: {
      spotifyTrack: {
        select: {
          id: true,
          name: true,
          spotifyId: true,
          popularity: true,
          thumbnails: true,
          songs: { select: { songId: true } },
        },
      },
    },
  });

  return artistTracks
    .filter(
      (record) => record.spotifyTrack && record.spotifyTrack.songs.length === 0,
    )
    .map((record) => ({
      id: record.spotifyTrack.id,
      name: record.spotifyTrack.name,
      spotifyId: record.spotifyTrack.spotifyId,
      popularity: record.spotifyTrack.popularity,
      thumbnails: record.spotifyTrack.thumbnails,
    }))
    .sort((a, b) => (b.popularity ?? -1) - (a.popularity ?? -1));
}

// 트랙을 곡에 연결 (다대다 관계)
export async function addSpotifyTrackToSong(
  songId: number,
  trackId: number,
): Promise<{ success: boolean }> {
  if (!songId || Number.isNaN(songId)) {
    throw new Error("유효한 곡 ID가 필요합니다.");
  }
  if (!trackId || Number.isNaN(trackId)) {
    throw new Error("유효한 트랙 ID가 필요합니다.");
  }

  // 곡 존재 확인
  const song = await prisma.song.findUnique({
    where: { id: songId },
    select: { id: true },
  });

  if (!song) {
    throw new Error("곡을 찾을 수 없습니다.");
  }

  // 이미 연결되어 있는지 확인
  const existing = await prisma.songSpotifyTrack.findUnique({
    where: {
      songId_spotifyTrackId: { songId, spotifyTrackId: trackId },
    },
  });

  if (existing) {
    throw new Error("이미 연결된 트랙입니다.");
  }

  // 트랙을 곡에 연결 (다대다)
  await prisma.songSpotifyTrack.create({
    data: { songId, spotifyTrackId: trackId },
  });

  return { success: true };
}
