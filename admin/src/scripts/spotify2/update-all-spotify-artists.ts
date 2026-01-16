/**
 * 모든 SpotifyArtist의 정보를 Spotify API로 업데이트하는 스크립트
 *
 * 기능:
 * - DB의 모든 SpotifyArtist를 조회
 * - 각 아티스트에 대해 Spotify API로 최신 정보 조회
 * - 이름, 팔로워 수, 인기도, 장르, 이미지 URL 등 업데이트
 * - Rate limit 방지를 위해 요청 간 딜레이 적용
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify2/update-all-spotify-artists.ts
 * pnpm ts-node src/scripts/spotify2/update-all-spotify-artists.ts --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { SpotifyService } from "../spotify/spotify.service.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const spotifyService = new SpotifyService();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 [DRY RUN MODE] 실제 DB 업데이트는 수행하지 않습니다.\n");
  }

  // 1. 모든 SpotifyArtist 조회
  console.log("📋 SpotifyArtist 목록 조회 중...\n");

  const spotifyArtists = await prisma.spotifyArtist.findMany({
    select: {
      id: true,
      spotifyId: true,
      name: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`총 ${spotifyArtists.length}명의 아티스트를 업데이트합니다.\n`);

  let successCount = 0;
  let errorCount = 0;

  // 2. 각 아티스트에 대해 Spotify API 호출 및 업데이트
  for (let i = 0; i < spotifyArtists.length; i++) {
    const artist = spotifyArtists[i];
    const progress = `[${i + 1}/${spotifyArtists.length}]`;

    try {
      const spotifyData = await spotifyService.getArtistById(artist.spotifyId);

      console.log(
        `${progress} ✅ ${artist.name} → ${spotifyData.name} (팔로워: ${spotifyData.followers.total.toLocaleString()}, 인기도: ${spotifyData.popularity})`,
      );

      if (!isDryRun) {
        await prisma.spotifyArtist.update({
          where: { id: artist.id },
          data: {
            spotifyUrl: spotifyData.external_urls.spotify,
            name: spotifyData.name,
            popularity: spotifyData.popularity,
            followers: spotifyData.followers.total,
            genres: spotifyData.genres,
            thumbnails: spotifyData.images.map((img) => img.url),
          },
        });
      }

      successCount++;
    } catch (error) {
      console.error(`${progress} ❌ ${artist.name} (${artist.spotifyId}): ${error}`);
      errorCount++;
    }

    // Rate limit 방지 (100ms 딜레이)
    if (i < spotifyArtists.length - 1) {
      await sleep(100);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 결과 요약");
  console.log("=".repeat(50));
  console.log(`성공: ${successCount}명`);
  console.log(`실패: ${errorCount}명`);
  console.log(`총계: ${spotifyArtists.length}명`);

  if (isDryRun) {
    console.log("\n🔍 [DRY RUN] 실제 DB 업데이트는 수행되지 않았습니다.");
  }

  console.log("\n🎉 완료!");
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
