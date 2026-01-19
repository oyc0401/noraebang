import { prisma } from "../prisma.js";

export interface UnmappedData {
  artistId: number;
  name: string;
  nameKo: string;
  nameJa?: string;
  nameLatin?: string;
  songs: Array<{
    id: number;
    title: string;
    titleKo?: string;
    titleJa?: string;
    titleLatin?: string;
  }>;
  youtubeVideos: Array<{
    videoId: string;
    videoTitle: string;
    duration?: number;
    viewCount?: number;
  }>;
  mappedSongsWithoutLatin: Array<{
    id: number;
    title: string;
    titleKo?: string;
    titleJa?: string;
  }>;
}

export interface MappingItem {
  songId: number;
  songTitle: string;
  videoId: string;
  videoName: string;
}

export interface LatinItem {
  songId: number;
  songTitle: string;
  titleLatin: string;
}

export interface MappingPayload {
  artistId: number;
  artistName: string;
  song: MappingItem[];
  latin?: LatinItem[];
}

/**
 * 아티스트의 매핑 안된 곡과 유튜브 영상 조회
 */
export async function getUnmappedData(artistId: number): Promise<UnmappedData> {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      nameJa: true,
      nameLatin: true,
    },
  });

  if (!artist) {
    throw new Error(`아티스트를 찾을 수 없습니다: ${artistId}`);
  }

  // 유튜브에 매핑되지 않은 곡 조회
  const songs = await prisma.song.findMany({
    where: {
      artistSongs: {
        some: { artistId },
      },
      youtubeVideos: { none: {} },
      youtubeVideoId: null,
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleJa: true,
      titleLatin: true,
    },
    orderBy: { id: "asc" },
  });

  // 곡에 매핑되지 않은 유튜브 비디오 조회 (조회수 100만 이상)
  const youtubeVideos = await prisma.youtubeVideo.findMany({
    where: {
      channels: {
        some: {
          youtubeChannel: { artistId },
        },
      },
      songs: { none: {} },
      viewCount: { gte: 1000000 },
    },
    select: {
      videoId: true,
      title: true,
      durationSeconds: true,
      viewCount: true,
    },
    orderBy: { viewCount: "desc" },
  });

  // 유튜브 매핑은 되었지만 titleLatin이 없는 곡 조회
  const mappedSongsWithoutLatin = await prisma.song.findMany({
    where: {
      artistSongs: {
        some: { artistId },
      },
      OR: [
        { youtubeVideos: { some: {} } },
        { youtubeVideoId: { not: null } },
      ],
      titleLatin: null,
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleJa: true,
    },
    orderBy: { id: "asc" },
  });

  return {
    artistId: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    nameJa: artist.nameJa ?? undefined,
    nameLatin: artist.nameLatin ?? undefined,
    songs: songs.map((song) => ({
      id: song.id,
      title: song.title,
      titleKo: song.titleKo ?? undefined,
      titleJa: song.titleJa ?? undefined,
      titleLatin: song.titleLatin ?? undefined,
    })),
    youtubeVideos: youtubeVideos.map((video) => ({
      videoId: video.videoId,
      videoTitle: video.title ?? "",
      duration: video.durationSeconds ?? undefined,
      viewCount: video.viewCount ? Number(video.viewCount) : undefined,
    })),
    mappedSongsWithoutLatin: mappedSongsWithoutLatin.map((song) => ({
      id: song.id,
      title: song.title,
      titleKo: song.titleKo ?? undefined,
      titleJa: song.titleJa ?? undefined,
    })),
  };
}

/**
 * 곡-영상 매핑 적용
 */
export async function applyMapping(payload: MappingPayload): Promise<{
  success: boolean;
  mappedCount: number;
  skippedCount: number;
}> {
  let mappedCount = 0;
  let skippedCount = 0;

  for (const item of payload.song) {
    // 이미 매핑되어 있는지 확인
    const existing = await prisma.songYoutubeVideo.findUnique({
      where: {
        songId_youtubeVideoId: {
          songId: item.songId,
          youtubeVideoId: item.videoId,
        },
      },
    });

    if (existing) {
      skippedCount++;
      continue;
    }

    await prisma.songYoutubeVideo.create({
      data: {
        songId: item.songId,
        youtubeVideoId: item.videoId,
      },
    });
    mappedCount++;
  }

  return { success: true, mappedCount, skippedCount };
}
