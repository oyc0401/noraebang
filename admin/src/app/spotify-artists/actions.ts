"use server";

import { prisma } from "@/lib/prisma";

// 스포티파이 ID가 중복되는 아티스트 조회
export async function getArtistsWithDuplicateSpotifyId(
  offset = 0,
  limit = 500,
  catalog?: string | null,
) {
  // 중복된 spotifyId를 가진 아티스트들 찾기 (카탈로그 필터 적용)
  const duplicateSpotifyIds = catalog
    ? await prisma.$queryRaw<{ spotify_id: string; count: bigint }[]>`
        SELECT spotify_id, COUNT(*)::bigint as count
        FROM artist
        WHERE spotify_id IS NOT NULL AND home_catalog = ${catalog}
        GROUP BY spotify_id
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC, spotify_id ASC
      `
    : await prisma.$queryRaw<{ spotify_id: string; count: bigint }[]>`
        SELECT spotify_id, COUNT(*)::bigint as count
        FROM artist
        WHERE spotify_id IS NOT NULL
        GROUP BY spotify_id
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC, spotify_id ASC
      `;

  const spotifyIds = duplicateSpotifyIds.map((row) => row.spotify_id);

  // 해당 spotifyId를 가진 아티스트들 조회
  const artists = await prisma.artist.findMany({
    where: {
      spotifyId: {
        in: spotifyIds,
      },
      ...(catalog ? { homeCatalog: catalog } : {}),
    },
    include: {
      spotifyArtist: true,
      _count: {
        select: {
          artistSongs: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
    skip: offset,
    take: limit,
  });

  return artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    nameLatin: artist.nameLatin ?? undefined,
    slug: artist.slug ?? undefined,
    spotifyId: artist.spotifyId ?? undefined,
    homeCatalog: artist.homeCatalog ?? undefined,
    thumbnailDefault: artist.thumbnailDefault ?? undefined,
    spotifyArtist: artist.spotifyArtist
      ? {
          id: artist.spotifyArtist.id,
          spotifyId: artist.spotifyArtist.spotifyId,
          name: artist.spotifyArtist.name,
          popularity: artist.spotifyArtist.popularity ?? undefined,
          followers: artist.spotifyArtist.followers ?? undefined,
          genres: artist.spotifyArtist.genres,
          thumbnails: artist.spotifyArtist.thumbnails,
        }
      : undefined,
    songCount: artist._count.artistSongs,
  }));
}

// 특정 spotifyId를 가진 모든 아티스트 조회
export async function getArtistsBySpotifyId(spotifyId: string) {
  const artists = await prisma.artist.findMany({
    where: {
      spotifyId,
    },
    include: {
      spotifyArtist: true,
      _count: {
        select: {
          artistSongs: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  return artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    nameLatin: artist.nameLatin ?? undefined,
    slug: artist.slug ?? undefined,
    spotifyId: artist.spotifyId ?? undefined,
    homeCatalog: artist.homeCatalog ?? undefined,
    thumbnailDefault: artist.thumbnailDefault ?? undefined,
    spotifyArtist: artist.spotifyArtist
      ? {
          id: artist.spotifyArtist.id,
          spotifyId: artist.spotifyArtist.spotifyId,
          name: artist.spotifyArtist.name,
          popularity: artist.spotifyArtist.popularity ?? undefined,
          followers: artist.spotifyArtist.followers ?? undefined,
          genres: artist.spotifyArtist.genres,
          thumbnails: artist.spotifyArtist.thumbnails,
        }
      : undefined,
    songCount: artist._count.artistSongs,
  }));
}

// 스포티파이 ID 제거
export async function removeSpotifyId(artistId: number) {
  try {
    await prisma.artist.update({
      where: { id: artistId },
      data: { spotifyId: null },
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "스포티파이 ID 제거 실패",
    };
  }
}

// 스포티파이 ID 변경
export async function updateSpotifyId(artistId: number, newSpotifyId: string) {
  try {
    const trimmedId = newSpotifyId.trim();
    if (!trimmedId) {
      return { success: false, error: "스포티파이 ID를 입력해주세요." };
    }

    // SpotifyArtist가 없으면 생성
    const existingSpotifyArtist = await prisma.spotifyArtist.findUnique({
      where: { spotifyId: trimmedId },
    });

    if (!existingSpotifyArtist) {
      await prisma.spotifyArtist.create({
        data: {
          spotifyId: trimmedId,
          name: "noinfo",
        },
      });
    }

    await prisma.artist.update({
      where: { id: artistId },
      data: { spotifyId: trimmedId },
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "스포티파이 ID 변경 실패",
    };
  }
}

// 가수 병합 (from의 곡들을 to로 이전)
export async function mergeArtist(fromArtistId: number, toArtistId: number) {
  try {
    // 1. fromArtist의 모든 곡을 가져옴
    const fromArtistSongs = await prisma.artistSong.findMany({
      where: { artistId: fromArtistId },
    });

    // 2. toArtist에 곡 추가 (중복 방지)
    for (const artistSong of fromArtistSongs) {
      await prisma.artistSong.upsert({
        where: {
          artistId_songId: {
            artistId: toArtistId,
            songId: artistSong.songId,
          },
        },
        create: {
          artistId: toArtistId,
          songId: artistSong.songId,
          order: artistSong.order,
          role: artistSong.role,
        },
        update: {
          // 이미 존재하면 업데이트 안 함
        },
      });
    }

    // 3. fromArtist에서 곡 제거
    await prisma.artistSong.deleteMany({
      where: { artistId: fromArtistId },
    });

    return { success: true, movedSongsCount: fromArtistSongs.length };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "가수 병합 실패",
    };
  }
}

// 전체 중복 카운트 조회 (무한 스크롤용)
export async function getDuplicateArtistsCount() {
  const duplicateSpotifyIds = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(DISTINCT a.id)::bigint as count
    FROM artist a
    WHERE a.spotify_id IN (
      SELECT spotify_id
      FROM artist
      WHERE spotify_id IS NOT NULL
      GROUP BY spotify_id
      HAVING COUNT(*) > 1
    )
  `;

  return Number(duplicateSpotifyIds[0]?.count ?? 0);
}

// 아티스트의 모든 곡 조회
export async function getSongsByArtistId(artistId: number) {
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
        },
      },
    },
  });

  return songs.map((as) => ({
    id: as.song.id,
    title: as.song.title,
    titleKo: as.song.titleKo ?? undefined,
    catalog: as.song.catalog ?? undefined,
    youtubeVideoId: as.song.youtubeVideoId ?? undefined,
    thumbnailDefault: as.song.thumbnailDefault ?? undefined,
    karaokeSongs: as.song.karaokeSongs.map((ks) => ({
      provider: ks.provider,
      karaokeNo: ks.karaokeNo,
    })),
    artists: as.song.artistSongs.map((owner) => ({
      id: owner.artistId,
      name: owner.artist.name,
      nameKo: owner.artist.nameKo,
    })),
  }));
}
