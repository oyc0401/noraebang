/**
 * CSV에서 곡이 1개인 협업 아티스트를 읽어서 자동으로 매핑 작업 생성
 *
 * 사용법:
 * pnpm ts-node src/scripts/artist/generate-bulk-operations.ts
 * pnpm ts-node src/scripts/artist/generate-bulk-operations.ts --limit=50
 * pnpm ts-node src/scripts/artist/generate-bulk-operations.ts --skip=0 --limit=50
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import pg from "pg";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const COLLABORATION_KEYWORDS = [
  "with",
  "&",
  "X",
  "feat",
  "featuring",
  "ft",
  "duet",
  "Duet",
  "prod",
  "Prod",
];

// CLI 인자 파싱
const args = process.argv.slice(2);
const skipArg = args.find((arg) => arg.startsWith("--skip="));
const limitArg = args.find((arg) => arg.startsWith("--limit="));

const skip = skipArg ? parseInt(skipArg.split("=")[1], 10) : 0;
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 50;

type Operation = {
  type: "copy_songs_and_delete" | "merge_artists";
  description: string;
  fromArtistId: number;
  toArtistIds?: number[];
  toArtistId?: number;
  note?: string;
};

function parseArtistName(name: string): string[] {
  const lowerName = name.toLowerCase();

  // with, feat, prod 등 키워드로 분리
  let parts: string[] = [];

  if (lowerName.includes("(with ")) {
    const match = name.match(/^(.+?)\(with (.+?)\)$/i);
    if (match) {
      parts = [match[1].trim(), match[2].trim()];
    }
  } else if (lowerName.includes("(duet with ")) {
    const match = name.match(/^(.+?)\(duet with (.+?)\)$/i);
    if (match) {
      parts = [match[1].trim(), match[2].trim()];
    }
  } else if (lowerName.includes("(feat")) {
    const match = name.match(/^(.+?)\((?:rap )?feat\.?(.+?)\)$/i);
    if (match) {
      parts = [match[1].trim(), match[2].trim()];
    }
  } else if (lowerName.includes("(prod")) {
    const match = name.match(/^(.+?)\(prod\.?(.+?)\)$/i);
    if (match) {
      parts = [match[1].trim(), match[2].trim()];
    }
  } else if (name.includes("&")) {
    parts = name.split("&").map((p) => p.trim());
  } else if (lowerName.includes(" x ")) {
    parts = name.split(/\s+x\s+/i).map((p) => p.trim());
  }

  return parts.filter((p) => p.length > 0);
}

async function main() {
  console.log("🚀 대량 매핑 작업 생성을 시작합니다...\n");
  console.log(`Skip: ${skip}, Limit: ${limit}\n`);

  // 곡이 1개인 협업 아티스트 조회
  const collabArtists = await prisma.artist.findMany({
    where: {
      OR: COLLABORATION_KEYWORDS.flatMap((keyword) => [
        { name: { contains: keyword, mode: "insensitive" } },
        { nameKo: { contains: keyword, mode: "insensitive" } },
      ]),
    },
    include: {
      _count: {
        select: { artistSongs: true },
      },
    },
    orderBy: { id: "asc" },
  });

  const oneSong = collabArtists.filter((a) => a._count.artistSongs === 1);
  console.log(`총 ${oneSong.length}명의 곡이 1개인 협업 아티스트 발견\n`);

  const operations: Operation[] = [];
  let processed = 0;
  let skipped = 0;

  for (const artist of oneSong.slice(skip, skip + limit)) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(
      `처리 중 (${processed + 1}/${limit}): ${artist.nameKo || artist.name} (ID: ${artist.id})`,
    );
    console.log(`${"=".repeat(80)}`);

    const searchName = artist.nameKo || artist.name;
    const parts = parseArtistName(searchName);

    if (parts.length === 0) {
      console.log(`   ⚠️  파싱 실패: "${searchName}"`);
      skipped++;
      processed++;
      continue;
    }

    console.log(`   파싱 결과: ${parts.join(" / ")}`);

    // 각 파트에 대해 아티스트 찾기
    const foundArtists: any[] = [];

    for (const part of parts) {
      const found = await prisma.artist.findMany({
        where: {
          OR: [
            { name: { contains: part, mode: "insensitive" } },
            { nameKo: { contains: part, mode: "insensitive" } },
          ],
          id: { not: artist.id }, // 자기 자신 제외
        },
        include: {
          _count: {
            select: { artistSongs: true },
          },
        },
        orderBy: [{ id: "asc" }],
      });

      // 곡이 많은 순으로 정렬
      found.sort((a, b) => b._count.artistSongs - a._count.artistSongs);

      if (found.length > 0) {
        const best = found[0];
        console.log(
          `   → "${part}" 검색: ${best.nameKo || best.name} (ID: ${best.id}, 곡: ${best._count.artistSongs}개)`,
        );

        // 곡이 2개 이상인 아티스트만 추가
        if (best._count.artistSongs >= 2) {
          foundArtists.push(best);
        }
      } else {
        console.log(`   → "${part}" 검색: 결과 없음`);
      }
    }

    if (foundArtists.length === 0) {
      console.log(`   ❌ 매핑할 아티스트를 찾지 못했습니다.`);
      skipped++;
      processed++;
      continue;
    }

    // 중복 제거
    const uniqueArtists = Array.from(
      new Set(foundArtists.map((a) => a.id)),
    ).map((id) => foundArtists.find((a) => a.id === id));

    if (uniqueArtists.length === 1) {
      // 1명이면 merge (아티스트 완전 삭제)
      operations.push({
        type: "merge_artists",
        description: `${searchName} → ${uniqueArtists[0].nameKo || uniqueArtists[0].name}`,
        fromArtistId: artist.id,
        toArtistId: uniqueArtists[0].id,
        note: `${searchName} (곡 1개) → ${uniqueArtists[0].nameKo || uniqueArtists[0].name} (곡 ${uniqueArtists[0]._count.artistSongs}개)`,
      });
      console.log(`   ✅ merge 작업 추가`);
    } else {
      // 2명 이상이면 copy_songs_and_delete
      operations.push({
        type: "copy_songs_and_delete",
        description: `${searchName} → ${uniqueArtists.map((a) => a.nameKo || a.name).join(", ")}`,
        fromArtistId: artist.id,
        toArtistIds: uniqueArtists.map((a) => a.id),
        note: `${searchName} (곡 1개) → ${uniqueArtists.map((a) => `${a.nameKo || a.name} (곡 ${a._count.artistSongs}개)`).join(", ")}`,
      });
      console.log(`   ✅ copy_songs_and_delete 작업 추가`);
    }

    processed++;
  }

  console.log(`\n\n${"=".repeat(80)}`);
  console.log(`✅ 처리 완료!`);
  console.log(`${"=".repeat(80)}`);
  console.log(`처리됨: ${processed}개`);
  console.log(`생성된 작업: ${operations.length}개`);
  console.log(`스킵됨: ${skipped}개`);

  if (operations.length > 0) {
    // JSON 파일에 추가
    const jsonPath = path.join(__dirname, "artist-mapping-operations.json");
    const existing = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    existing.operations.push(...operations);

    fs.writeFileSync(jsonPath, JSON.stringify(existing, null, 2), "utf-8");
    console.log(
      `\n📝 ${operations.length}개의 작업이 artist-mapping-operations.json에 추가되었습니다.`,
    );
  }
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
