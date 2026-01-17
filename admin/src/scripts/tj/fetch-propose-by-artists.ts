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
//
// 동작:
// - 신규: create
// - 기존(중복): query가 null/다르면 update로 채움
// - 중복 판단 키: saveDate + songSinger + songTitle + email1 + email2

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type Counters = {
  totalFetched: number;
  totalCreated: number;
  totalUpdated: number;
  totalSkipped: number; // existing + query도 이미 동일해서 진짜 아무것도 안 함
  totalErrors: number;
};

async function fetchProposeByArtists(dryRun: boolean, startId: number) {
  console.log(
    `🚀 TJ 신청곡 수집 시작 (${startId} <= id <= 300 아티스트 대상)\n`,
  );

  if (dryRun) {
    console.log("🔍 Dry run mode - 데이터 저장 없이 조회만 수행\n");
  }

  // 1) startId <= id <= 300 && tjName 있는 아티스트 조회
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

  const counters: Counters = {
    totalFetched: 0,
    totalCreated: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    totalErrors: 0,
  };

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];
    const tjName = artist.tjName!;

    console.log(
      `[${i + 1}/${artists.length}] #${artist.id} ${artist.name} (tjName: ${tjName})`,
    );

    try {
      // 2) TJ 신청곡 검색
      const proposeItems = await searchTJPropose(tjName);

      if (proposeItems.length === 0) {
        console.log(`   → 신청곡 없음`);
        continue;
      }

      counters.totalFetched += proposeItems.length;
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

      // 3) DB 반영 (중복 체크 + 기존 데이터 query 업데이트)
      let createdThisArtist = 0;
      let updatedThisArtist = 0;
      let skippedThisArtist = 0;

      for (const item of proposeItems) {
        const where = {
          saveDate: BigInt(item.save_date),
          songSinger: item.po_song_singer,
          songTitle: item.po_song_title,
          email1: item.po_email1,
          email2: item.po_email2,
        } as const;

        const existing = await prisma.songPropose.findFirst({ where });

        if (existing) {
          // query가 비었거나 다르면 채움
          if (existing.query !== tjName) {
            await prisma.songPropose.update({
              where: { id: existing.id },
              data: { query: tjName },
            });
            counters.totalUpdated++;
            updatedThisArtist++;
          } else {
            counters.totalSkipped++;
            skippedThisArtist++;
          }
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

        counters.totalCreated++;
        createdThisArtist++;
      }

      console.log(
        `   → 반영 완료 (신규: ${createdThisArtist}, 업데이트: ${updatedThisArtist}, 스킵: ${skippedThisArtist})`,
      );
    } catch (error) {
      counters.totalErrors++;
      console.error(`   ❌ 오류: ${error}`);
    }

    // API 속도 제한 방지
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("\n✅ 완료!");
  console.log(`   총 조회: ${counters.totalFetched}개`);
  if (!dryRun) {
    console.log(`   신규 저장: ${counters.totalCreated}개`);
    console.log(`   기존 업데이트(query 채움): ${counters.totalUpdated}개`);
    console.log(`   스킵(이미 동일): ${counters.totalSkipped}개`);
  }
  console.log(`   오류: ${counters.totalErrors}건`);
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
