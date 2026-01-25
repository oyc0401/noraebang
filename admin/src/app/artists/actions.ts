"use server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type SortOption =
  | "id_desc"
  | "id_asc"
  | "name_asc"
  | "name_desc"
  | "song_count_desc"
  | "song_count_asc";
const DEFAULT_SORT: SortOption = "id_asc";
const ARTIST_CATALOGS = ["KPOP", "JPOP", "POP", "CPOP"] as const;
export type ArtistCatalog = (typeof ARTIST_CATALOGS)[number];

export async function getArtists(
  sort: SortOption = DEFAULT_SORT,
  take = 500,
  cursor?: number,
  search?: string,
) {
  let orderBy: any = {};

  if (sort === "id_desc") orderBy.id = "desc";
  else if (sort === "id_asc") orderBy.id = "asc";
  else if (sort === "name_asc") orderBy.nameKo = "asc";
  else if (sort === "name_desc") orderBy.nameKo = "desc";
  else if (sort === "song_count_desc")
    orderBy = { artistSongs: { _count: "desc" } };
  else if (sort === "song_count_asc")
    orderBy = { artistSongs: { _count: "asc" } };
  else orderBy.nameKo = "asc";

  const where: any[] = [];
  const trimmedSearch = search?.trim();
  let idFilter: number | null = null;

  if (trimmedSearch) {
    if (/^\d+$/.test(trimmedSearch)) {
      idFilter = Number.parseInt(trimmedSearch, 10);
    }

    where.push(
      { name: { contains: trimmedSearch, mode: "insensitive" } },
      { nameKo: { contains: trimmedSearch, mode: "insensitive" } },
      { slug: { contains: trimmedSearch, mode: "insensitive" } },
    );
    if (idFilter) {
      where.push({ id: idFilter });
    }
  }

  const useSearch = Boolean(trimmedSearch);

  const artists = await prisma.artist.findMany({
    ...(useSearch
      ? {}
      : {
          take: take + 1,
          ...(cursor
            ? {
                skip: 1,
                cursor: {
                  id: cursor,
                },
              }
            : {}),
        }),
    include: {
      _count: {
        select: { artistSongs: true },
      },
    },
    where: where.length
      ? {
          OR: where,
        }
      : undefined,
    orderBy,
  });

  const hasMore = useSearch ? false : artists.length > take;
  const filtered = useSearch
    ? artists
    : hasMore
      ? artists.slice(0, take)
      : artists;
  return {
    artists: filtered.map((a) => ({
      id: a.id,
      name: a.name,
      nameKo: a.nameKo,
      slug: a.slug ?? undefined,
      homeCatalog: a.homeCatalog ?? undefined,
      spotifyId: a.spotifyId ?? undefined,
      thumbnailDefault: a.thumbnailDefault ?? undefined,
      thumbnailMedium: a.thumbnailMedium ?? undefined,
      thumbnailHigh: a.thumbnailHigh ?? undefined,
      songCount: a._count.artistSongs,
    })),
    hasMore,
    nextCursor: hasMore ? filtered[filtered.length - 1].id : undefined,
  };
}

export async function getArtistById(artistId: number) {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    include: {
      _count: {
        select: { artistSongs: true },
      },
    },
  });

  if (!artist) return null;

  return {
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    slug: artist.slug ?? undefined,
    homeCatalog: artist.homeCatalog ?? undefined,
    spotifyId: artist.spotifyId ?? undefined,
    thumbnailDefault: artist.thumbnailDefault ?? undefined,
    thumbnailMedium: artist.thumbnailMedium ?? undefined,
    thumbnailHigh: artist.thumbnailHigh ?? undefined,
    songCount: artist._count.artistSongs,
  };
}

export async function getSongsByArtist(artistId: number) {
  const songs = await prisma.artistSong.findMany({
    where: { artistId },
    include: {
      song: {
        include: {
          karaokeSongs: true,
          artistSongs: {
            include: {
              artist: true,
            },
          },
          songSpotifyTracks: {
            include: {
              spotifyTrack: true,
            },
            orderBy: {
              spotifyTrack: { popularity: "desc" },
            },
            take: 1,
          },
        },
      },
    },
  });

  return songs.map((as) => ({
    id: as.song.id,
    title: as.song.title,
    titleKo: as.song.titleKo ?? undefined,
    catalog: as.song.catalog ?? undefined,
    karaokeSongs: as.song.karaokeSongs.map((ks) => ({
      provider: ks.provider,
      karaokeNo: ks.karaokeNo,
    })),
    owners: as.song.artistSongs.map((owner) => ({
      id: owner.artistId,
      name: owner.artist.name,
      nameKo: owner.artist.nameKo,
    })),
    spotifyGroup: as.song.songSpotifyTracks.length > 0
      ? {
          primaryTrack: as.song.songSpotifyTracks[0]
            ? {
                id: as.song.songSpotifyTracks[0].spotifyTrack.id,
                spotifyId: as.song.songSpotifyTracks[0].spotifyTrack.spotifyId,
                spotifyUrl:
                  as.song.songSpotifyTracks[0].spotifyTrack.spotifyUrl ??
                  undefined,
                name: as.song.songSpotifyTracks[0].spotifyTrack.name,
                thumbnails: as.song.songSpotifyTracks[0].spotifyTrack.thumbnails,
                releaseDate:
                  as.song.songSpotifyTracks[0].spotifyTrack.releaseDate ??
                  undefined,
                durationMs:
                  as.song.songSpotifyTracks[0].spotifyTrack.durationMs ??
                  undefined,
                popularity:
                  as.song.songSpotifyTracks[0].spotifyTrack.popularity ??
                  undefined,
              }
            : undefined,
        }
      : undefined,
  }));
}

export async function updateArtistSlug(artistId: number, slug: string) {
  const sanitizedSlug = slug.trim().replace(/^@/, "");

  if (!sanitizedSlug) {
    throw new Error("별칭을 입력해주세요.");
  }

  try {
    const updated = await prisma.artist.update({
      where: { id: artistId },
      data: { slug: sanitizedSlug },
      select: { id: true, slug: true },
    });

    return {
      slug: updated.slug ?? undefined,
    };
  } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("이미 존재하는 별칭입니다.");
    }

    throw error;
  }
}

export async function updateArtistName(artistId: number, name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("이름을 입력해주세요.");
  }

  const updated = await prisma.artist.update({
    where: { id: artistId },
    data: { name: trimmedName },
    select: { id: true, name: true },
  });

  return {
    name: updated.name,
  };
}

export async function updateArtistNameKo(artistId: number, nameKo: string) {
  const trimmedNameKo = nameKo.trim();

  if (!trimmedNameKo) {
    throw new Error("한국어 이름을 입력해주세요.");
  }

  const updated = await prisma.artist.update({
    where: { id: artistId },
    data: { nameKo: trimmedNameKo },
    select: { id: true, nameKo: true },
  });

  return {
    nameKo: updated.nameKo,
  };
}

export async function updateSongTitle(
  songId: number,
  title: string,
  titleKo?: string,
) {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    throw new Error("제목을 입력해주세요.");
  }

  const updated = await prisma.song.update({
    where: { id: songId },
    data: {
      title: trimmedTitle,
      titleKo: titleKo?.trim() || undefined,
    },
    select: { id: true, title: true, titleKo: true },
  });

  return {
    title: updated.title,
    titleKo: updated.titleKo ?? undefined,
  };
}

export async function createKaraokeSong(
  songId: number,
  provider: "TJ" | "KY" | "JOYSOUND",
  karaokeNo: string,
) {
  const trimmedNo = karaokeNo.trim();

  if (!trimmedNo) {
    throw new Error("노래방 번호를 입력해주세요.");
  }

  const created = await prisma.karaokeSong.create({
    data: {
      songId,
      provider,
      karaokeNo: trimmedNo,
    },
  });

  return created;
}

export async function updateKaraokeSong(
  songId: number,
  provider: "TJ" | "KY" | "JOYSOUND",
  karaokeNo: string,
) {
  const trimmedNo = karaokeNo.trim();

  if (!trimmedNo) {
    throw new Error("노래방 번호를 입력해주세요.");
  }

  const existing = await prisma.karaokeSong.findFirst({
    where: {
      songId,
      provider,
    },
  });

  if (!existing) {
    throw new Error("노래방 번호를 찾을 수 없습니다.");
  }

  const updated = await prisma.karaokeSong.update({
    where: { id: existing.id },
    data: {
      karaokeNo: trimmedNo,
    },
  });

  return updated;
}

export async function deleteKaraokeSong(
  songId: number,
  provider: "TJ" | "KY" | "JOYSOUND",
) {
  const existing = await prisma.karaokeSong.findFirst({
    where: {
      songId,
      provider,
    },
  });

  if (!existing) {
    throw new Error("노래방 번호를 찾을 수 없습니다.");
  }

  await prisma.karaokeSong.delete({
    where: { id: existing.id },
  });

  return { success: true };
}

export async function transferSongOwnership(
  songId: number,
  fromArtistId: number,
  toArtistId: number,
) {
  if (fromArtistId === toArtistId) {
    throw new Error("동일한 아티스트로는 이전할 수 없습니다.");
  }

  const targetArtist = await prisma.artist.findUnique({
    where: { id: toArtistId },
    select: { id: true },
  });

  if (!targetArtist) {
    throw new Error("이전할 아티스트를 찾을 수 없습니다.");
  }

  const existingRelation = await prisma.artistSong.findUnique({
    where: {
      artistId_songId: {
        artistId: fromArtistId,
        songId,
      },
    },
  });

  if (!existingRelation) {
    throw new Error("현재 아티스트와 곡의 연결을 찾을 수 없습니다.");
  }

  await prisma.$transaction([
    prisma.artistSong.upsert({
      where: {
        artistId_songId: {
          artistId: toArtistId,
          songId,
        },
      },
      update: {},
      create: {
        artistId: toArtistId,
        songId,
        order: existingRelation.order,
      },
    }),
    prisma.artistSong.delete({
      where: {
        artistId_songId: {
          artistId: fromArtistId,
          songId,
        },
      },
    }),
  ]);

  return { success: true };
}

export async function deleteArtist(artistId: number) {
  await prisma.artist.delete({
    where: { id: artistId },
  });

  return { success: true };
}

export async function addSongOwnership(songId: number, artistId: number) {
  const targetArtist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true },
  });

  if (!targetArtist) {
    throw new Error("추가할 아티스트를 찾을 수 없습니다.");
  }

  await prisma.artistSong.upsert({
    where: {
      artistId_songId: {
        artistId,
        songId,
      },
    },
    update: {},
    create: {
      artistId,
      songId,
    },
  });

  return { success: true };
}

export async function mergeArtist(
  sourceArtistId: number,
  targetArtistId: number,
) {
  if (sourceArtistId === targetArtistId) {
    throw new Error("동일한 아티스트로는 병합할 수 없습니다.");
  }

  const [sourceArtist, targetArtist] = await Promise.all([
    prisma.artist.findUnique({
      where: { id: sourceArtistId },
      select: { id: true, name: true, nameKo: true },
    }),
    prisma.artist.findUnique({
      where: { id: targetArtistId },
      select: { id: true, name: true, nameKo: true },
    }),
  ]);

  if (!sourceArtist) {
    throw new Error("원본 아티스트를 찾을 수 없습니다.");
  }

  if (!targetArtist) {
    throw new Error("대상 아티스트를 찾을 수 없습니다.");
  }

  const sourceSongs = await prisma.artistSong.findMany({
    where: { artistId: sourceArtistId },
    select: { songId: true, role: true },
  });

  await prisma.$transaction([
    ...sourceSongs.map((song) =>
      prisma.artistSong.upsert({
        where: {
          artistId_songId: {
            artistId: targetArtistId,
            songId: song.songId,
          },
        },
        update: {},
        create: {
          artistId: targetArtistId,
          songId: song.songId,
          order: song.order,
          role: song.role,
        },
      }),
    ),
    prisma.artist.delete({
      where: { id: sourceArtistId },
    }),
  ]);

  return {
    success: true,
    sourceArtist,
    targetArtist,
  };
}

export async function updateArtistCatalog(
  artistId: number,
  catalog: ArtistCatalog | null,
  updateNullSongCatalog = false,
) {
  if (!artistId) {
    throw new Error("아티스트 정보를 확인할 수 없습니다.");
  }

  if (catalog && !ARTIST_CATALOGS.includes(catalog)) {
    throw new Error("지원하지 않는 분류입니다.");
  }

  const relations = await prisma.artistSong.findMany({
    where: { artistId },
    select: { songId: true },
  });

  const songIds = [...new Set(relations.map((rel) => rel.songId))];
  const operations: Prisma.PrismaPromise<any>[] = [
    prisma.artist.update({
      where: { id: artistId },
      data: {
        homeCatalog: catalog,
      },
    }),
  ];
  let updatedSongCount = 0;

  if (catalog && updateNullSongCatalog && songIds.length > 0) {
    operations.push(
      prisma.song.updateMany({
        where: {
          id: { in: songIds },
          catalog: null,
        },
        data: {
          catalog,
        },
      }),
    );
  }

  const results = await prisma.$transaction(operations);

  if (catalog && updateNullSongCatalog && results.length > 1) {
    const songResult = results[results.length - 1] as Prisma.BatchPayload;
    updatedSongCount = songResult.count;
  }

  return {
    homeCatalog: catalog ?? undefined,
    updatedSongCount,
  };
}

export async function getSpotifyTracksByArtist(artistId: number) {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    include: {
      spotifyArtist: {
        include: {
          tracks: {
            include: {
              spotifyTrack: {
                include: {
                  primaryForGroup: true,
                },
              },
            },
            orderBy: [
              {
                spotifyTrack: {
                  popularity: "desc",
                },
              },
              {
                spotifyTrack: {
                  releaseDate: "desc",
                },
              },
            ],
          },
        },
      },
    },
  });

  if (!artist?.spotifyArtist) {
    return { spotifyArtistId: undefined, spotifyArtist: undefined, groups: [] };
  }

  type TrackData = {
    id: number;
    spotifyId: string;
    spotifyUrl: string | undefined;
    name: string;
    thumbnails: string[];
    releaseDate: string | undefined;
    durationMs: number | undefined;
    previewUrl: string | undefined;
    popularity: number | undefined;
    groupId: number | undefined;
    isPrimary: boolean;
    musicBrainzRecordingId: string | undefined;
  };

  // 그룹별로 묶기
  const groupMap = new Map<
    number,
    {
      groupId: number;
      primaryTrack?: TrackData;
      trackCount: number;
    }
  >();

  const ungroupedTracks: TrackData[] = [];

  for (const { spotifyTrack } of artist.spotifyArtist.tracks) {
    const trackData: TrackData = {
      id: spotifyTrack.id,
      spotifyId: spotifyTrack.spotifyId,
      spotifyUrl: spotifyTrack.spotifyUrl ?? undefined,
      name: spotifyTrack.name,
      thumbnails: spotifyTrack.thumbnails,
      releaseDate: spotifyTrack.releaseDate ?? undefined,
      durationMs: spotifyTrack.durationMs ?? undefined,
      previewUrl: spotifyTrack.previewUrl ?? undefined,
      popularity: spotifyTrack.popularity ?? undefined,
      groupId: spotifyTrack.groupId ?? undefined,
      isPrimary: spotifyTrack.primaryForGroup !== null,
      musicBrainzRecordingId: spotifyTrack.musicBrainzRecordingId ?? undefined,
    };

    if (spotifyTrack.groupId) {
      const existing = groupMap.get(spotifyTrack.groupId);
      if (existing) {
        existing.trackCount++;
        if (trackData.isPrimary) {
          existing.primaryTrack = trackData;
        }
      } else {
        groupMap.set(spotifyTrack.groupId, {
          groupId: spotifyTrack.groupId,
          primaryTrack: trackData.isPrimary ? trackData : undefined,
          trackCount: 1,
        });
      }
    } else {
      ungroupedTracks.push(trackData);
    }
  }

  // 그룹화된 데이터 생성
  const groups = Array.from(groupMap.values())
    .filter((group) => group.primaryTrack !== undefined)
    .map((group) => ({
      groupId: group.groupId,
      trackCount: group.trackCount,
      primaryTrack: group.primaryTrack as TrackData,
    }));

  return {
    spotifyArtistId: artist.spotifyArtist.id,
    spotifyArtist: {
      id: artist.spotifyArtist.id,
      spotifyId: artist.spotifyArtist.spotifyId,
      spotifyUrl: artist.spotifyArtist.spotifyUrl ?? undefined,
      name: artist.spotifyArtist.name,
      popularity: artist.spotifyArtist.popularity ?? undefined,
      followers: artist.spotifyArtist.followers ?? undefined,
      genres: artist.spotifyArtist.genres,
      thumbnails: artist.spotifyArtist.thumbnails,
    },
    groups: [
      ...groups,
      ...ungroupedTracks.map((track) => ({
        groupId: undefined,
        trackCount: 1,
        primaryTrack: track,
      })),
    ],
  };
}

export async function getSpotifyTracksByGroupId(groupId: number) {
  const tracks = await prisma.spotifyTrack.findMany({
    where: { groupId },
    include: {
      primaryForGroup: true,
    },
    orderBy: [
      {
        popularity: "desc",
      },
      {
        releaseDate: "desc",
      },
    ],
  });

  return tracks.map((track) => ({
    id: track.id,
    spotifyId: track.spotifyId,
    spotifyUrl: track.spotifyUrl ?? undefined,
    name: track.name,
    thumbnails: track.thumbnails,
    releaseDate: track.releaseDate ?? undefined,
    durationMs: track.durationMs ?? undefined,
    previewUrl: track.previewUrl ?? undefined,
    popularity: track.popularity ?? undefined,
    groupId: track.groupId ?? undefined,
    isPrimary: track.primaryForGroup !== null,
  }));
}

// 곡 검색
export async function searchSongs(query: string, limit = 20) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const songs = await prisma.song.findMany({
    where: {
      OR: [
        { title: { contains: trimmedQuery, mode: "insensitive" } },
        { titleKo: { contains: trimmedQuery, mode: "insensitive" } },
        {
          id: /^\d+$/.test(trimmedQuery)
            ? Number.parseInt(trimmedQuery, 10)
            : undefined,
        },
      ],
    },
    include: {
      artistSongs: {
        include: {
          artist: true,
        },
      },
    },
    take: limit,
    orderBy: {
      id: "desc",
    },
  });

  return songs.map((song) => ({
    id: song.id,
    title: song.title,
    titleKo: song.titleKo ?? undefined,
    catalog: song.catalog ?? undefined,
    artists: song.artistSongs.map((as) => ({
      id: as.artist.id,
      name: as.artist.name,
      nameKo: as.artist.nameKo,
    })),
  }));
}

// 아티스트 생성
export async function createArtist(data: {
  name: string;
  nameKo: string;
  slug?: string;
  homeCatalog?: ArtistCatalog;
  songIds?: number[];
}) {
  const trimmedName = data.name.trim();
  const trimmedNameKo = data.nameKo.trim();

  if (!trimmedName) {
    throw new Error("영문 이름을 입력해주세요.");
  }

  if (!trimmedNameKo) {
    throw new Error("한글 이름을 입력해주세요.");
  }

  const sanitizedSlug = data.slug?.trim().replace(/^@/, "");

  try {
    const artist = await prisma.artist.create({
      data: {
        name: trimmedName,
        nameKo: trimmedNameKo,
        slug: sanitizedSlug || undefined,
        homeCatalog: data.homeCatalog || undefined,
      },
      select: {
        id: true,
        name: true,
        nameKo: true,
        slug: true,
        homeCatalog: true,
      },
    });

    // 곡 연결
    if (data.songIds && data.songIds.length > 0) {
      await prisma.artistSong.createMany({
        data: data.songIds.map((songId, index) => ({
          artistId: artist.id,
          songId,
          order: index,
        })),
        skipDuplicates: true,
      });
    }

    return {
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      slug: artist.slug ?? undefined,
      homeCatalog: artist.homeCatalog ?? undefined,
    };
  } catch (error: any) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("이미 존재하는 별칭입니다.");
    }

    throw error;
  }
}

// 스포티파이 ID 업데이트
export async function updateArtistSpotifyId(
  artistId: number,
  spotifyId: string | null,
) {
  const trimmedSpotifyId = spotifyId?.trim() || null;

  const updated = await prisma.artist.update({
    where: { id: artistId },
    data: { spotifyId: trimmedSpotifyId },
    select: { id: true, spotifyId: true },
  });

  return {
    spotifyId: updated.spotifyId ?? undefined,
  };
}
