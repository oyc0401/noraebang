import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { searchTJPropose } from "../../thirdparty/tj/searchPropose";

// TJ 신청곡 수집 스크립트
// id <= 300인 아티스트들의 tjName으로 TJ 신청곡을 검색하고 DB에 저장합니다.
//
// pnpm ts-node src/scripts/tj/fetch-propose-by-artists.ts
// pnpm ts-node src/scripts/tj/fetch-propose-by-artists.ts --dry-run
// pnpm ts-node src/scripts/tj/fetch-propose-by-artists.ts 147          # id >= 147부터 시작
// pnpm ts-node src/scripts/tj/fetch-propose-totalSkipped++;by-artists.ts 147 --dry-run

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function fetchProposeByArtists(dryRun: boolean, startId: number) {
  console.log(
    `🚀 TJ 신청곡 수집 시작 (${startId} <= id <= 300 아티스트 대상)\n`,
  );

  if (dryRun) {
    console.log("🔍 Dry run mode - 데이터 저장 없이 조회만 수행\n");
  }

  // 1. startId <= id <= 300이고 tjName이 있는 아티스트 조회
  const artists = await prisma.artist.findMany({
    where: {
      id: { gte: startId, lte: 300 },
      tjName: { not: null },
    },
    select: {
      id: true,
      name: true,
      tjName: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`📋 대상 아티스트: ${artists.length}명\n`);

  let totalFetched = 0;
  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];
    const tjName = artist.tjName!;

    console.log(
      `[${i + 1}/${artists.length}] #${artist.id} ${artist.name} (tjName: ${tjName})`,
    );

    try {
      // 2. TJ 신청곡 검색
      const proposeItems = await searchTJPropose(tjName);

      if (proposeItems.length === 0) {
        console.log(`   → 신청곡 없음`);
        continue;
      }

      totalFetched += proposeItems.length;
      console.log(`   → ${proposeItems.length}개 신청곡 발견`);

      if (dryRun) {
        // dry run: 첫 3개만 미리보기
        for (const item of proposeItems.slice(0, 3)) {
          console.log(
            `      - ${item.po_song_title} / ${item.po_song_singer} (${item.po_regdate_view})`,
          );
        }
        if (proposeItems.length > 3) {
          console.log(`      ... 외 ${proposeItems.length - 3}개`);
        }
        continue;
      }

      // 3. DB에 저장 (중복 체크)
      for (const item of proposeItems) {
        // 중복 체크: saveDate + songSinger + songTitle 조합으로
        const existing = await prisma.songPropose.findFirst({
          where: {
            saveDate: BigInt(item.save_date),
            songSinger: item.po_song_singer,
            songTitle: item.po_song_title,
          },
        });

        if (existing) {
          totalSkipped++;
          continue;
        }

        await prisma.songPropose.create({
          data: {
            query: tjName, // 검색할 때 사용한 tjName 저장
            songSinger: item.po_song_singer,
            songTitle: item.po_song_title,
            content: item.po_content,
            name: item.po_name,
            email1: item.po_email1,
            email2: item.po_email2,
            otCode: item.ot_code,
            hit: item.po_hit,
            regdateView: item.po_regdate_view,
            saveDate: BigInt(item.save_date),
            updateDate: BigInt(item.update_date),
          },
        });
        totalCreated++;
      }

      console.log(
        `   → 저장 완료 (신규: ${proposeItems.length - totalSkipped}, 스킵: ${totalSkipped})`,
      );
    } catch (error) {
      totalErrors++;
      console.error(`   ❌ 오류: ${error}`);
    }

    // API 속도 제한 방지
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n✅ 완료!");
  console.log(`   총 조회: ${totalFetched}개`);
  if (!dryRun) {
    console.log(`   신규 저장: ${totalCreated}개`);
    console.log(`   중복 스킵: ${totalSkipped}개`);
  }
  console.log(`   오류: ${totalErrors}건`);
}

// 커맨드 라인 인자 처리
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const startIdArg = args.find((arg) => !arg.startsWith("--"));
const startId = startIdArg ? parseInt(startIdArg, 10) : 1;

fetchProposeByArtists(dryRun, startId)
  .then(async () => {
    console.log("\n🎉 Done!");
    await prisma.$disconnect();
    await pool.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("\n💥 Fatal error:", error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
