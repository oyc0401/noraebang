/**
 * Song 제목 한글 발음 채우기 스크립트
 *
 * - titleJaKana → titleJaPronu: kanabarum 라이브러리 사용 (일본어 가나 → 한글)
 * - titleLatin → titleLatinPronu: hangulize 라이브러리 사용 (영어/로마자 → 한글)
 *
 * 항상 --dry-run 모드로 결과를 검토한 뒤 실제 업데이트하세요.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Kanabarum } from "kanabarum";
import { Pool } from "pg";
import { latinToKo } from "../pron/latinTokorea";

// pnpm ts-node src/scripts/name/backfill-song-title-pronu.ts --dry-run
// pnpm ts-node src/scripts/name/backfill-song-title-pronu.ts

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
  await kanabarum.init();

  console.log("======================================");
  console.log("Song titleJaPronu & titleLatinPronu Backfill");
  console.log("======================================");
  console.log("Options:", options, "\n");

  console.log("📦 Fetching songs...");
  const songs = await prisma.song.findMany({
    where: {
      OR: [{ titleJaKana: { not: null } }, { titleLatin: { not: null } }],
    },
    select: {
      id: true,
      title: true,
      titleJaKana: true,
      titleJaPronu: true,
      titleLatin: true,
      titleLatinPronu: true,
    },
    orderBy: { id: "asc" },
  });
  console.log(`✓ 대상 곡: ${songs.length}개\n`);

  let jaUpdated = 0;
  let latinUpdated = 0;
  let skippedJa = 0;
  let skippedLatin = 0;

  for (const song of songs) {
    const updateData: { titleJaPronu?: string; titleLatinPronu?: string } = {};

    // titleJaKana → titleJaPronu
    const jaSource = song.titleJaKana?.trim();
    if (jaSource) {
      const jaConverted = kanabarum
        .kanaToHangul(jaSource)
        .replace(/\s+/g, " ")
        .trim();

      if (jaConverted) {
        const jaExisting = song.titleJaPronu?.trim() ?? "";
        if (jaExisting.length === 0 || jaExisting !== jaConverted) {
          updateData.titleJaPronu = jaConverted;
          if (isDryRun) {
            console.log(
              `[DRY-RUN][JA] #${song.id} ${song.title}: "${jaSource}" -> "${jaConverted}" (기존: "${jaExisting}")`,
            );
          }
          jaUpdated++;
        } else {
          skippedJa++;
        }
      } else {
        skippedJa++;
      }
    }

    // titleLatin → titleLatinPronu (latinToKo 사용)
    const latinSource = song.titleLatin?.trim();
    if (latinSource) {
      const latinConverted = latinToKo(latinSource).replace(/\s+/g, " ").trim();

      if (latinConverted) {
        const latinExisting = song.titleLatinPronu?.trim() ?? "";
        if (latinExisting.length === 0 || latinExisting !== latinConverted) {
          updateData.titleLatinPronu = latinConverted;
          if (isDryRun) {
            console.log(
              `[DRY-RUN][LATIN] #${song.id} ${song.title}: "${latinSource}" -> "${latinConverted}" (기존: "${latinExisting}")`,
            );
          }
          latinUpdated++;
        } else {
          skippedLatin++;
        }
      } else {
        skippedLatin++;
      }
    }

    // 업데이트할 내용이 있으면 DB 업데이트
    if (!isDryRun && Object.keys(updateData).length > 0) {
      await prisma.song.update({
        where: { id: song.id },
        data: updateData,
      });
      console.log(
        `업데이트 완료 #${song.id} ${song.title}:`,
        Object.entries(updateData)
          .map(([k, v]) => `${k}="${v}"`)
          .join(", "),
      );
    }
  }

  console.log("\n======================================");
  console.log("Summary");
  console.log("======================================");
  console.log(`총 대상 곡: ${songs.length}`);
  console.log(`[JA] 업데이트: ${jaUpdated}, 스킵: ${skippedJa}`);
  console.log(`[LATIN] 업데이트: ${latinUpdated}, 스킵: ${skippedLatin}`);
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
