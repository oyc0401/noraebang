import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// id가 300 이하인 아티스트를 대상으로, 해당 아티스트의 TJ 곡들을 순회하면서
// 가장 많이 등록된 TJ 아티스트 이름을 tjName 필드에 저장하는 스크립트
//
// pnpm ts-node src/scripts/tj/backfill-artist-tj-name.ts
// pnpm ts-node src/scripts/tj/backfill-artist-tj-name.ts --dry-run

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("🎵 아티스트 tjName 백필 스크립트");
  console.log("📋 대상: id <= 300인 아티스트");
  if (isDryRun) {
    console.log("🔍 DRY RUN 모드 (실제 업데이트는 수행되지 않음)");
  }
  console.log("");

  // id가 300 이하인 아티스트 조회 (artistSongs -> song -> tjSong 경로)
  const artists = await prisma.artist.findMany({
    where: {
      id: { lte: 30000 },
    },
    select: {
      id: true,
      name: true,
      tjName: true,
      artistSongs: {
        select: {
          song: {
            select: {
              tjSong: {
                select: {
                  artist: true,
                  artistList: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  console.log(`✅ ${artists.length}명의 아티스트 조회됨`);
  console.log("");

  let updatedCount = 0;
  let skippedCount = 0;
  let noTjSongsCount = 0;

  for (const artist of artists) {
    // 모든 TJ 곡에서 아티스트 이름 수집
    const nameCount = new Map<string, number>();

    for (const { song } of artist.artistSongs) {
      const tjSong = song.tjSong;
      if (!tjSong) continue;

      // artist 필드 사용 (단일 아티스트명)
      if (tjSong.artist) {
        nameCount.set(tjSong.artist, (nameCount.get(tjSong.artist) || 0) + 1);
      }

      // artistList도 함께 집계 (더 정확한 결과를 위해)
      for (const name of tjSong.artistList) {
        nameCount.set(name, (nameCount.get(name) || 0) + 1);
      }
    }

    if (nameCount.size === 0) {
      noTjSongsCount++;
      continue;
    }

    // 가장 많이 등장한 이름 찾기
    let mostFrequentName = "";
    let maxCount = 0;

    for (const [name, count] of nameCount.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentName = name;
      }
    }

    // 이미 같은 값이 설정되어 있으면 스킵
    if (artist.tjName === mostFrequentName) {
      skippedCount++;
      continue;
    }

    console.log(
      `  [${artist.id}] ${artist.name}: "${mostFrequentName}" (${maxCount}곡)`,
    );

    if (!isDryRun) {
      await prisma.artist.update({
        where: { id: artist.id },
        data: { tjName: mostFrequentName },
      });
    }

    updatedCount++;
  }

  console.log("");
  console.log("📊 결과:");
  console.log(`  - 업데이트${isDryRun ? " 예정" : "됨"}: ${updatedCount}명`);
  console.log(`  - 스킵 (동일 값): ${skippedCount}명`);
  console.log(`  - TJ 곡 없음: ${noTjSongsCount}명`);
  console.log("");
  console.log("✨ 완료");
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
