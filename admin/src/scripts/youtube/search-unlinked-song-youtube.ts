/**
 * 특정 아티스트(또는 전체)의 미연결 Song들을 YouTube에서 검색한 결과를 JSON으로 저장하는 스크립트
 *
 * 사용법:
 * pnpm tsx src/scripts/youtube/search-unlinked-song-youtube.ts
 * pnpm tsx src/scripts/youtube/search-unlinked-song-youtube.ts 4
 */

import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { prisma } from "../../lib/prisma.ts";
import { searchUnlinkedSongYoutube } from "../../lib/admin/search-unlinked-song-youtube.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(
  __dirname,
  "../../../output/search-unlinked-song-youtube",
);

const numericArg = process.argv.find((arg) => /^\d+$/.test(arg));
const targetArtistId = numericArg ? Number(numericArg) : null;

async function resolveArtistIds(): Promise<number[]> {
  if (targetArtistId) {
    return [targetArtistId];
  }

  const artists = await prisma.artist.findMany({
    where: {
      artistSongs: {
        some: {
          song: {
            youtubeVideoId: null,
            youtubeVideos: { none: {} },
          },
        },
      },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return artists.map((artist) => artist.id);
}

async function main() {
  const artistIds = await resolveArtistIds();

  if (artistIds.length === 0) {
    console.log("⚠️ 검색 대상 아티스트가 없습니다.");
    return;
  }

  console.log(
    `🎯 검색 대상: ${artistIds.length}명${
      targetArtistId ? ` (artistId=${targetArtistId})` : ""
    }`,
  );

  const results = [];
  let failed = 0;

  for (const artistId of artistIds) {
    try {
      const entry = await searchUnlinkedSongYoutube(artistId);
      results.push(entry);
    } catch (error) {
      failed += 1;
      console.error(`❌ Artist ${artistId} 처리 실패:`, error);
    }
  }

  if (artistIds.length !== 1) {
    throw new Error("이 스크립트는 숫자 artistId 인자를 하나만 받습니다.");
  }

  const filePath = path.join(OUTPUT_DIR, `artist-youtube-${artistIds[0]}.json`);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(
    filePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        artistIds,
        failedArtistCount: failed,
        results,
      },
      null,
      2,
    ),
    "utf-8",
  );

  console.log(`✅ 저장 완료: ${filePath}`);
  if (failed > 0) {
    console.log(`⚠️ 처리 실패 아티스트: ${failed}명`);
  }
}

main()
  .catch((error) => {
    console.error("❌ 스크립트 실패:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
