/**
 * jpop-artists.json 파일의 nameKo를 DB에 업데이트하는 스크립트
 * JSON 파일에 정의된 아티스트의 nameKo 값을 Artist 테이블에 저장합니다.
 *
 * pnpm ts-node src/scripts/artist/update-jpop-name-ko.ts --dry-run
 * pnpm ts-node src/scripts/artist/update-jpop-name-ko.ts --apply
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

type JpopArtist = {
  id: number;
  name: string;
  nameKo: string;
};

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const apply = process.argv.includes("--apply");

  if (!dryRun && !apply) {
    console.error("❌ --dry-run 또는 --apply 옵션을 지정해주세요.");
    process.exit(1);
  }

  const jsonPath = path.join(__dirname, "jpop-artists.json");
  const jsonContent = fs.readFileSync(jsonPath, "utf-8");
  const artists: JpopArtist[] = JSON.parse(jsonContent);

  console.log(`📁 ${artists.length}명의 아티스트 데이터 로드 완료`);
  console.log(dryRun ? "🔍 DRY-RUN 모드" : "✏️ APPLY 모드");

  let updated = 0;
  let skipped = 0;

  for (const artist of artists) {
    const dbArtist = await prisma.artist.findUnique({
      where: { id: artist.id },
      select: { id: true, name: true, nameKo: true },
    });

    if (!dbArtist) {
      console.log(`  ⚠️ #${artist.id} ${artist.name} (${artist.nameKo}) - DB에 없음`);
      continue;
    }

    if (dbArtist.nameKo === artist.nameKo) {
      skipped++;
      continue;
    }

    console.log(
      `  #${artist.id} ${dbArtist.name}: "${dbArtist.nameKo}" → "${artist.nameKo}"`,
    );

    if (apply) {
      await prisma.artist.update({
        where: { id: artist.id },
        data: { nameKo: artist.nameKo },
      });
    }

    updated++;
  }

  console.log(`\n📊 결과:`);
  console.log(`  - 업데이트: ${updated}명`);
  console.log(`  - 스킵 (동일): ${skipped}명`);
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
