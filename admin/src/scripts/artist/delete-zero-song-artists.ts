/**
 * 곡이 0개인 아티스트를 삭제하는 스크립트
 *
 * pnpm ts-node src/scripts/artist/delete-zero-song-artists.ts
 * pnpm ts-node src/scripts/artist/delete-zero-song-artists.ts --dry-run
 *
 * 주의: 아티스트 삭제 시 ArtistSong, YoutubeChannel 등이 Cascade로 같이 삭제됩니다.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const isDryRun = process.argv.includes("--dry-run");

async function deleteZeroSongArtists() {
  console.log("🔍 곡이 0개인 아티스트를 조회합니다...");
  if (isDryRun) {
    console.log("🧪 DRY RUN 모드 - 삭제 없이 목록만 출력합니다.\n");
  } else {
    console.log("⚠️  실제 삭제가 수행됩니다. 백업 여부를 확인하세요!\n");
  }

  try {
    const zeroSongArtists = await prisma.artist.findMany({
      where: { artistSongs: { none: {} } },
      select: { id: true, name: true, nameKo: true, slug: true },
      orderBy: { id: "asc" },
    });

    if (zeroSongArtists.length === 0) {
      console.log("✅ 곡이 0개인 아티스트가 없습니다.");
      return;
    }

    for (const artist of zeroSongArtists) {
      console.log(
        `🗑️  ${artist.name} (ID: ${artist.id}) - nameKo: ${
          artist.nameKo ?? "-"
        }, slug: ${artist.slug ?? "-"}`,
      );
    }

    console.log(
      `\n총 ${zeroSongArtists.length}명의 아티스트가 삭제 대상입니다.`,
    );

    if (isDryRun) {
      console.log("ℹ️  --dry-run 옵션으로 인해 삭제는 수행되지 않았습니다.");
      return;
    }

    const artistIds = zeroSongArtists.map((artist) => artist.id);
    const deleted = await prisma.artist.deleteMany({
      where: { id: { in: artistIds } },
    });

    console.log(`✅ ${deleted.count}명의 아티스트를 삭제했습니다.`);
  } catch (error) {
    console.error("❌ 실행 중 오류가 발생했습니다.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

deleteZeroSongArtists();
