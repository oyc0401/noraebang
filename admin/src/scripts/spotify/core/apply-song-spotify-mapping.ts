/**
 * artist-mapping.json을 읽어서 Song과 SpotifyTrack을 실제로 DB에 매핑
 *
 * 로직:
 * - artist-mapping.json 파일 읽기
 * - songs 배열에 있는 각 곡을 해당 spotifyTrack과 연결
 * - SongSpotifyTrack 테이블에 upsert
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/apply-song-spotify-mapping.ts
 * pnpm ts-node src/scripts/spotify/apply-song-spotify-mapping.ts --dry-run
 */

import "dotenv/config";
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface MappingResult {
  spotifyTrack: {
    id: number;
    name: string;
  };
  songs: Array<{
    id: number;
    name: string;
  }>;
  candidateSong: Array<{
    id: number;
    name: string;
  }>;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No changes will be made to the database\n");
  }

  // JSON 파일 읽기
  const mappingPath = "artist-mapping.json";
  if (!fs.existsSync(mappingPath)) {
    console.error(`❌ File not found: ${mappingPath}`);
    console.error("   Run generate-song-spotify-mapping.ts first!");
    process.exit(1);
  }

  const mappings: MappingResult[] = JSON.parse(
    fs.readFileSync(mappingPath, "utf-8"),
  );

  console.log(`📂 Loaded ${mappings.length} mappings from ${mappingPath}\n`);

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const mapping of mappings) {
    // songs가 비어있으면 스킵
    if (mapping.songs.length === 0) {
      skippedCount++;
      continue;
    }

    for (const song of mapping.songs) {
      try {
        if (isDryRun) {
          console.log(
            `[DRY RUN] Would connect Song ${song.id} (${song.name}) ↔ SpotifyTrack ${mapping.spotifyTrack.id} (${mapping.spotifyTrack.name})`,
          );
          createdCount++;
        } else {
          // upsert: songId가 이미 있으면 spotifyTrackId만 업데이트, 없으면 새로 생성
          await prisma.songSpotifyTrack.upsert({
            where: {
              songId: song.id,
            },
            create: {
              songId: song.id,
              spotifyTrackId: mapping.spotifyTrack.id,
            },
            update: {
              spotifyTrackId: mapping.spotifyTrack.id,
            },
          });

          console.log(
            `✅ Connected Song ${song.id} (${song.name}) ↔ SpotifyTrack ${mapping.spotifyTrack.id} (${mapping.spotifyTrack.name})`,
          );
          createdCount++;
        }
      } catch (error: any) {
        console.error(
          `❌ Error connecting Song ${song.id} ↔ SpotifyTrack ${mapping.spotifyTrack.id}: ${error.message}`,
        );
        errorCount++;
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("📊 Summary:");
  console.log(`  ✅ Connected: ${createdCount}`);
  console.log(`  ⏭️  Skipped (no songs): ${skippedCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log("=".repeat(70) + "\n");

  if (isDryRun) {
    console.log("✨ Dry run complete! Run without --dry-run to apply changes.");
  } else {
    console.log("✨ Done!");
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  prisma.$disconnect();
  process.exit(1);
});
