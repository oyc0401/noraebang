/**
 * 잘못된 merge 작업을 수정하는 스크립트
 * With/&/feat가 있는 경우 양쪽 아티스트를 모두 찾아서 copy_songs_and_delete로 변환
 *
 * pnpm ts-node src/scripts/artist/fix-wrong-merges.ts
 * pnpm ts-node src/scripts/artist/fix-wrong-merges.ts --dry-run
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

const isDryRun = process.argv.includes("--dry-run");

type MergeOperation = {
  type: "merge_artists";
  description: string;
  fromArtistId: number;
  toArtistId: number;
  note?: string;
};

type CopyOperation = {
  type: "copy_songs_and_delete";
  description: string;
  fromArtistId: number;
  toArtistIds: number[];
  note?: string;
};

type Operation = MergeOperation | CopyOperation;

type OperationsFile = {
  operations: Operation[];
};

function hasCollaborationKeyword(desc: string): boolean {
  return (
    desc.includes("With") ||
    desc.includes("&") ||
    desc.includes("feat") ||
    desc.includes("Feat") ||
    desc.includes("Duet") ||
    desc.includes("duet") ||
    desc.includes("Prod") ||
    desc.includes("prod") ||
    desc.includes("X")
  );
}

async function main() {
  console.log("🚀 잘못된 merge 작업을 수정합니다...\\n");

  if (isDryRun) {
    console.log("⚠️  DRY RUN 모드\\n");
  }

  // JSON 파일 읽기
  const jsonPath = path.join(__dirname, "artist-mapping-operations.json");
  const jsonContent = fs.readFileSync(jsonPath, "utf-8");
  const data: OperationsFile = JSON.parse(jsonContent);

  console.log(`📄 총 ${data.operations.length}개의 작업\\n`);

  const newOperations: Operation[] = [];
  let fixedCount = 0;
  let keptCount = 0;

  for (const op of data.operations) {
    if (
      op.type === "merge_artists" &&
      hasCollaborationKeyword(op.description)
    ) {
      console.log(`\\n${"=".repeat(80)}`);
      console.log(`🔍 검토 중: ${op.description}`);

      // fromArtist 조회
      const fromArtist = await prisma.artist.findUnique({
        where: { id: op.fromArtistId },
        select: { id: true, name: true, nameKo: true },
      });

      if (!fromArtist) {
        console.log(`   ❌ fromArtist not found`);
        newOperations.push(op);
        keptCount++;
        continue;
      }

      const searchName = fromArtist.nameKo || fromArtist.name;

      // 파싱해서 양쪽 아티스트 찾기
      let parts: string[] = [];

      if (/\(with\s+/i.test(searchName)) {
        const match = searchName.match(/^(.+?)\(with\s+(.+?)\)$/i);
        if (match) {
          parts = [match[1].trim(), match[2].trim()];
        }
      } else if (/\(duet\s+with\s+/i.test(searchName)) {
        const match = searchName.match(/^(.+?)\(duet\s+with\s+(.+?)\)$/i);
        if (match) {
          parts = [match[1].trim(), match[2].trim()];
        }
      } else if (searchName.includes("&")) {
        parts = searchName.split("&").map((p) => p.trim());
      }

      if (parts.length === 2) {
        // 양쪽 아티스트 찾기
        const foundArtists: any[] = [];

        for (const part of parts) {
          const found = await prisma.artist.findMany({
            where: {
              OR: [
                { name: { contains: part, mode: "insensitive" } },
                { nameKo: { contains: part, mode: "insensitive" } },
              ],
              id: { not: fromArtist.id },
            },
            include: {
              _count: { select: { artistSongs: true } },
            },
            orderBy: [{ id: "asc" }],
          });

          found.sort((a, b) => b._count.artistSongs - a._count.artistSongs);

          if (found.length > 0 && found[0]._count.artistSongs >= 1) {
            foundArtists.push(found[0]);
            console.log(
              `   → "${part}" 찾음: ${found[0].nameKo || found[0].name} (곡 ${found[0]._count.artistSongs}개)`,
            );
          } else {
            console.log(`   → "${part}" 못찾음`);
          }
        }

        // 중복 제거
        const uniqueArtists = Array.from(
          new Set(foundArtists.map((a) => a.id)),
        ).map((id) => foundArtists.find((a) => a.id === id));

        if (uniqueArtists.length >= 2) {
          // 양쪽 아티스트 모두 찾았으면 copy_songs_and_delete로 변환
          const newOp: CopyOperation = {
            type: "copy_songs_and_delete",
            description: `${searchName} → ${uniqueArtists.map((a) => a.nameKo || a.name).join(", ")}`,
            fromArtistId: fromArtist.id,
            toArtistIds: uniqueArtists.map((a) => a.id),
            note: `${searchName} (곡 1개) → ${uniqueArtists.map((a) => `${a.nameKo || a.name} (곡 ${a._count.artistSongs}개)`).join(", ")}`,
          };

          console.log(`   ✅ merge → copy_songs_and_delete로 변환`);
          newOperations.push(newOp);
          fixedCount++;
        } else {
          console.log(`   ⏭️  유지 (양쪽 아티스트를 못찾음)`);
          newOperations.push(op);
          keptCount++;
        }
      } else {
        console.log(`   ⏭️  유지 (파싱 실패)`);
        newOperations.push(op);
        keptCount++;
      }
    } else {
      newOperations.push(op);
      keptCount++;
    }
  }

  console.log(`\\n\\n${"=".repeat(80)}`);
  console.log(`✅ 완료!`);
  console.log(`${"=".repeat(80)}`);
  console.log(`수정됨: ${fixedCount}개`);
  console.log(`유지됨: ${keptCount}개`);
  console.log(`총 작업: ${newOperations.length}개`);

  if (!isDryRun) {
    const newData: OperationsFile = { operations: newOperations };
    fs.writeFileSync(jsonPath, JSON.stringify(newData, null, 2), "utf-8");
    console.log(`\\n📝 JSON 파일 저장 완료`);
  } else {
    console.log(`\\n⚠️  DRY RUN - JSON 파일 저장 안함`);
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
