import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// TJ 노래 데이터베이스에서 가수별 곡의 개수를 출력하는 스크립트
// artistList만 기반으로 각 가수의 곡 수를 집계 (featureList, producerList 제외)
// pnpm ts-node src/scripts/tj/count-songs-by-artist.ts
// pnpm ts-node src/scripts/tj/count-songs-by-artist.ts --limit=50
// pnpm ts-node src/scripts/tj/count-songs-by-artist.ts --dry-run

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1]) : 20;

  console.log("🎵 TJ 가수별 곡 개수 집계");
  console.log(`📊 출력 개수: ${limit}명`);
  if (isDryRun) {
    console.log("🔍 DRY RUN 모드 (실제 작업은 수행되지 않음)");
  }
  console.log("");

  if (isDryRun) {
    console.log(
      "ℹ️  이 스크립트는 조회만 수행하므로 dry-run 모드는 일반 모드와 동일합니다.",
    );
    console.log("");
  }

  // SQL로 아티스트 집계
  // artistList만 사용하여 곡 수 집계
  const result = await prisma.$queryRaw<
    Array<{ artist: string; song_count: bigint }>
  >`
    SELECT
      artist,
      COUNT(*) as song_count
    FROM (
      SELECT UNNEST(artist_list) as artist
      FROM tj_song
    ) as all_artists
    GROUP BY artist
    ORDER BY song_count DESC, artist ASC
  `;

  console.log(`✅ 총 ${result.length.toLocaleString()}명의 가수 발견`);
  console.log("");

  // 상위 N명 출력
  console.log(`🏆 상위 ${limit}명:`);
  result.slice(0, limit).forEach((r, i) => {
    const count = Number(r.song_count);
    console.log(
      `  ${(i + 1).toString().padStart(3)}. ${r.artist.padEnd(30)} ${count.toLocaleString()}곡`,
    );
  });

  console.log("");
  console.log("✨ 집계 완료");

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
