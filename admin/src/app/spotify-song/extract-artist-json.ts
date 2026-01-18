"use server";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export type ArtistJsonData = {
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
};

export async function extractArtistJson(
  artistId: number,
): Promise<{
  success: boolean;
  filePath?: string;
  jsonString?: string;
  error?: string;
}> {
  try {
    // 아티스트 정보 조회
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
      return { success: false, error: "아티스트를 찾을 수 없습니다." };
    }

    // 유튜브에 매핑되지 않은 곡 조회 (해당 아티스트의 곡 중 youtubeVideos가 없는 것)
    const songs = await prisma.song.findMany({
      where: {
        artistSongs: {
          some: {
            artistId: artistId,
          },
        },
        youtubeVideos: {
          none: {},
        },
        youtubeVideoId: null,
      },
      select: {
        id: true,
        title: true,
        titleKo: true,
        titleJa: true,
        titleLatin: true,
      },
      orderBy: {
        id: "asc",
      },
    });

    // 곡에 매핑되지 않은 유튜브 비디오 조회 (해당 아티스트 채널의 비디오 중 songs가 없는 것, 조회수 100만 이상)
    const youtubeVideos = await prisma.youtubeVideo.findMany({
      where: {
        channels: {
          some: {
            youtubeChannel: {
              artistId: artistId,
            },
          },
        },
        songs: {
          none: {},
        },
        viewCount: {
          gte: 1000000,
        },
      },
      select: {
        videoId: true,
        title: true,
        durationSeconds: true,
        viewCount: true,
      },
      orderBy: {
        viewCount: "desc",
      },
    });

    // 유튜브 매핑은 되었지만 titleLatin이 없는 곡 조회
    const mappedSongsWithoutLatin = await prisma.song.findMany({
      where: {
        artistSongs: {
          some: {
            artistId: artistId,
          },
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
      orderBy: {
        id: "asc",
      },
    });

    const jsonData: ArtistJsonData = {
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
      mappedSongsWithoutLatin: mappedSongsWithoutLatin.map((song) => ({
        id: song.id,
        title: song.title,
        titleKo: song.titleKo ?? undefined,
        titleJa: song.titleJa ?? undefined,
      })),
      youtubeVideos: youtubeVideos.map((video) => ({
        videoId: video.videoId,
        videoTitle: video.title ?? "",
        duration: video.durationSeconds ?? undefined,
        viewCount: video.viewCount ? Number(video.viewCount) : undefined,
      })),
    };

    // 파일 저장
    const fileName = "unmap-youtube.json";
    const filePathFull = path.join(
      process.cwd(),
      "src/app/spotify-song",
      fileName,
    );
    const jsonString = JSON.stringify(jsonData, null, 2);

    await writeFile(filePathFull, jsonString, "utf-8");

    return { success: true, filePath: fileName, jsonString };
  } catch (err) {
    console.error("JSON 추출 실패:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "알 수 없는 오류",
    };
  }
}

type UnmapHelpJson = {
  artistId: number;
  song: Array<{
    songId: number;
    videoId: string;
    videoName: string;
  }>;
};

export async function applyYoutubeMappingFromJson(
  jsonString?: string,
): Promise<{
  success: boolean;
  mappedCount?: number;
  error?: string;
}> {
  try {
    let content: string;
    if (jsonString) {
      content = jsonString;
    } else {
      const filePath = path.join(
        process.cwd(),
        "src/app/spotify-song",
        "unmap-help.json",
      );
      content = await readFile(filePath, "utf-8");
    }
    const data: UnmapHelpJson = JSON.parse(content);

    let mappedCount = 0;

    for (const item of data.song) {
      // 이미 매핑되어 있는지 확인
      const existing = await prisma.songYoutubeVideo.findUnique({
        where: {
          songId_youtubeVideoId: {
            songId: item.songId,
            youtubeVideoId: item.videoId,
          },
        },
      });

      if (!existing) {
        await prisma.songYoutubeVideo.create({
          data: {
            songId: item.songId,
            youtubeVideoId: item.videoId,
          },
        });
        mappedCount++;
      }
    }

    return { success: true, mappedCount };
  } catch (err) {
    console.error("유튜브 매핑 적용 실패:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "알 수 없는 오류",
    };
  }
}
