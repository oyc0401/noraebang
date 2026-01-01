import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// TJ 노래 데이터베이스에서 모든 아티스트(artistList, featureList, producerList)를 추출하여 CSV 파일로 저장
// pnpm ts-node scripts/tj/export-all-artists.ts
// pnpm ts-node scripts/tj/export-all-artists.ts --output=backend/data/tj_all_artists.csv

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 출력 파일 경로
  const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
  const outputPath = outputArg
    ? outputArg.split("=")[1]
    : path.join(__dirname, "../../../data/tj_all_artists.csv");

  console.log("🎵 TJ 아티스트 추출 시작");
  console.log(`📄 출력 파일: ${outputPath}`);
  console.log("");

  // SQL로 아티스트 집계
  // artistList, featureList, producerList를 모두 합쳐서 중복 제거 후 곡 수 집계
  const result = await prisma.$queryRaw<
    Array<{ artist: string; song_count: bigint }>
  >`
    SELECT
      artist,
      COUNT(*) as song_count
    FROM (
      SELECT UNNEST(artist_list || feature_list || producer_list) as artist
      FROM tj_song
    ) as all_artists
    GROUP BY artist
    ORDER BY song_count DESC, artist ASC
  `;

  console.log(`✅ 총 ${result.length.toLocaleString()}명의 아티스트 발견`);
  console.log("");

  // CSV 형식으로 포맷팅
  const lines = [
    "artist,song_count",
    ...result.map((r) => {
      const count = Number(r.song_count);
      // CSV 이스케이프: 쉼표나 따옴표가 있으면 큰따옴표로 감싸기
      const artist =
        r.artist.includes(",") || r.artist.includes('"')
          ? `"${r.artist.replace(/"/g, '""')}"`
          : r.artist;
      return `${artist},${count}`;
    }),
  ];

  // 파일 저장
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, lines.join("\n"), "utf-8");

  console.log(`💾 파일 저장 완료: ${outputPath}`);
  console.log(`📊 총 ${result.length.toLocaleString()}명의 아티스트`);
  console.log("");

  // 상위 10명 출력
  console.log("🏆 상위 10명:");
  result.slice(0, 10).forEach((r, i) => {
    console.log(
      `  ${(i + 1).toString().padStart(2)}. ${r.artist} (${Number(r.song_count)}곡)`,
    );
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
