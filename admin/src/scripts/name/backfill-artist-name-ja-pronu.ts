/**
 * Artist.nameJaKana → Artist.nameJaPronu 한글 발음 채우기 스크립트
 *
 * KanaBarum 라이브러리를 이용하여 일본어 가나 이름을
 * 검색 친화적인 한글 표기로 변환합니다.
 * - Artist.nameJaKana가 존재하는 행만 처리합니다.
 * - 기본적으로 artistId, name, nameJaKana, nameJaPronu만 조회합니다.
 * - 아티스트 ID는 300 미만만 조회하고, titleJaKana가 있는 곡을 가진 아티스트만 조회합니다.
 * - 항상 --dry-run 모드로 결과를 검토한 뒤 실제 업데이트하세요.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { Kanabarum } from "kanabarum";

// pnpm ts-node src/scripts/name/backfill-artist-name-ja-pronu.ts
// pnpm ts-node src/scripts/name/backfill-artist-name-ja-pronu.ts --dry-run

type CliOptions = {
  dryRun: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`알 수 없는 옵션입니다: ${arg}`);
    }
  }

  return options;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const isDryRun = options.dryRun;
  if (!isDryRun) {
    console.warn("⚠️  --dry-run 없이 실행됩니다. 실제 DB가 수정됩니다.");
  }

  const kanabarum = new Kanabarum();
  kanabarum.init();

  console.log("======================================");
  console.log("Artist nameJaPronu Backfill");
  console.log("======================================");
  console.log("Options:", options, "\n");

  const where: Prisma.ArtistWhereInput = {
    nameJaKana: { not: null },
    id: { lt: 300 },
    artistSongs: {
      some: {
        song: { titleJaKana: { not: null } },
      },
    },
  };

  console.log("📦 Fetching artists...");
  const artists = await prisma.artist.findMany({
    where,
    select: {
      id: true,
      name: true,
      nameJaKana: true,
      nameJaPronu: true,
    },
    orderBy: { id: "asc" },
  });
  console.log(`✓ 대상 아티스트: ${artists.length}명\n`);

  let updated = 0;
  let skippedNoKana = 0;
  let skippedSame = 0;

  for (const artist of artists) {
    const source = artist.nameJaKana?.trim();
    if (!source) {
      skippedNoKana++;
      continue;
    }

    const converted = kanabarum
      .kanaToHangul(source)
      .replace(/\s+/g, " ")
      .trim();
    if (!converted) {
      skippedNoKana++;
      continue;
    }

    const existing = artist.nameJaPronu?.trim() ?? "";
    const shouldUpdate = existing.length === 0 || existing !== converted;
    if (!shouldUpdate) {
      skippedSame++;
      continue;
    }

    if (isDryRun) {
      console.log(
        `[DRY-RUN] #${artist.id} ${artist.name ?? ""}: "${source}" -> "${converted}" (기존: "${existing}")`,
      );
    } else {
      await prisma.artist.update({
        where: { id: artist.id },
        data: { nameJaPronu: converted },
      });
      console.log(
        `업데이트 완료 #${artist.id} ${artist.name ?? ""}: "${source}" -> "${converted}" (기존: "${existing}")`,
      );
    }

    updated++;
  }

  console.log("\n======================================");
  console.log("Summary");
  console.log("======================================");
  console.log(`총 대상: ${artists.length}`);
  console.log(`업데이트: ${updated}`);
  console.log(`스킵(카나 없음/변환 실패): ${skippedNoKana}`);
  console.log(`스킵(기존 값 동일): ${skippedSame}`);
  console.log("======================================");

  if (isDryRun) {
    console.log("\n※ dry-run 모드: DB는 변경되지 않았습니다.");
  } else {
    console.log("\n✓ All done!");
  }
}

main()
  .catch((error) => {
    console.error("✗ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
