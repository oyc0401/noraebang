/**
 * 이미 SpotifyTrack이 있는 Song 확인 스크립트
 *
 * 기능:
 * - SpotifyTrack이 매핑되어 있는 Song 조회
 * - Song 정보와 매핑된 SpotifyTrack 정보 출력
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/check-songs-with-spotify-track.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`\n=== SpotifyTrack이 있는 Song 확인 ===\n`);

  // SpotifyTrack이 있는 Song 조회
  const songsWithSpotifyTrack = await prisma.song.findMany({
    where: {
      spotifyTrack: {
        isNot: null,
      },
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      spotifyTrack: {
        select: {
          spotifyId: true,
          name: true,
          popularity: true,
        },
      },
    },
    orderBy: { id: "asc" },
  });

  console.log(
    `총 ${songsWithSpotifyTrack.length}개 Song에 SpotifyTrack이 매핑되어 있습니다.\n`,
  );

  if (songsWithSpotifyTrack.length === 0) {
    console.log("✅ 아직 SpotifyTrack이 매핑된 Song이 없습니다.\n");
    return;
  }

  // 상위 20개만 출력
  console.log("최근 매핑된 Song (최대 20개):");
  console.log("─".repeat(100));
  console.log(
    `${"Song ID".padEnd(8)} | ${"Title".padEnd(35)} | ${"Spotify Track Name".padEnd(35)} | ${"Pop"}`,
  );
  console.log("─".repeat(100));

  for (const song of songsWithSpotifyTrack.slice(0, 20)) {
    const songId = song.id.toString().padEnd(8);
    const title = (song.title || "").padEnd(35).substring(0, 35);
    const spotifyName = (song.spotifyTrack?.name || "")
      .padEnd(35)
      .substring(0, 35);
    const popularity = song.spotifyTrack?.popularity || "N/A";

    console.log(`${songId} | ${title} | ${spotifyName} | ${popularity}`);
  }
  console.log("─".repeat(100));
  console.log();

  if (songsWithSpotifyTrack.length > 20) {
    console.log(`... 외 ${songsWithSpotifyTrack.length - 20}개 더 있음\n`);
  }
}

main()
  .catch((error) => {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
