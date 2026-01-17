/**
 * 잘못 매핑된 협업 아티스트를 자동으로 재매핑하는 스크립트
 *
 * "싸이with하하" 같이 협업 표기가 들어간 아티스트가 곡이 적고,
 * 개별 아티스트("싸이", "하하")가 각각 많은 곡을 가지고 있으면
 * 협업 아티스트의 곡을 개별 아티스트들에게 재매핑합니다.
 *
 * pnpm ts-node src/scripts/artist/remap-collaboration-artists.ts
 * pnpm ts-node src/scripts/artist/remap-collaboration-artists.ts --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const isDryRun = process.argv.includes("--dry-run");

// 협업을 나타내는 구분자들
const COLLABORATION_PATTERNS = [
  { pattern: /\s*with\s+/i, name: "with" },
  { pattern: /\s*&\s*/, name: "&" },
  { pattern: /\s*X\s+/, name: "X" },
  { pattern: /\s*feat\.?\s+/i, name: "feat" },
  { pattern: /\s*featuring\s+/i, name: "featuring" },
  { pattern: /\s*ft\.?\s+/i, name: "ft" },
];

// 협업 아티스트 이름 파싱
function parseCollaborationArtist(
  name: string,
  nameKo: string,
): string[] | null {
  const targetName = nameKo || name;

  for (const { pattern } of COLLABORATION_PATTERNS) {
    if (pattern.test(targetName)) {
      // 구분자로 분리
      const parts = targetName
        .split(pattern)
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        return parts;
      }
    }
  }

  return null;
}

async function main() {
  console.log("🔍 잘못 매핑된 협업 아티스트를 찾습니다...\n");
  if (isDryRun) {
    console.log("⚠️  DRY RUN 모드: 실제 변경은 수행되지 않습니다.\n");
  }

  // 1. 키워드가 포함된 아티스트들 찾기
  const keywords = ["with", "&", "X", "feat", "featuring", "ft"];
  const artists = await prisma.artist.findMany({
    select: {
      id: true,
      name: true,
      nameKo: true,
      _count: {
        select: { artistSongs: true },
      },
    },
  });

  const collaborationArtists = artists.filter((artist) => {
    const searchText = [artist.name, artist.nameKo]
      .map((v) => v?.toLowerCase() ?? "")
      .join(" ");
    return keywords.some((keyword) =>
      searchText.includes(keyword.toLowerCase()),
    );
  });

  console.log(
    `📊 협업 키워드가 포함된 아티스트: ${collaborationArtists.length}명\n`,
  );

  let remappedCount = 0;

  for (const collabArtist of collaborationArtists) {
    const songCount = collabArtist._count.artistSongs;

    // 곡이 너무 많으면 스킵 (정상적인 아티스트일 가능성)
    if (songCount > 10) {
      continue;
    }

    // 이름 파싱 시도
    const parsedNames = parseCollaborationArtist(
      collabArtist.name,
      collabArtist.nameKo,
    );
    if (!parsedNames || parsedNames.length < 2) {
      continue;
    }

    // 파싱된 이름들로 실제 아티스트 찾기
    const realArtists = await Promise.all(
      parsedNames.map(async (parsedName) => {
        // 더 정확한 매칭을 위해 여러 방법 시도
        // 1. 정확히 일치
        let found = await prisma.artist.findFirst({
          where: {
            OR: [
              { name: { equals: parsedName, mode: "insensitive" } },
              { nameKo: { equals: parsedName, mode: "insensitive" } },
            ],
            id: { not: collabArtist.id },
          },
          select: {
            id: true,
            name: true,
            nameKo: true,
            _count: {
              select: { artistSongs: true },
            },
          },
        });

        // 2. 정확히 일치하지 않으면 포함으로 검색하되, 이름 길이가 비슷한 것만
        if (!found && parsedName.length >= 2) {
          const candidates = await prisma.artist.findMany({
            where: {
              OR: [
                { name: { contains: parsedName, mode: "insensitive" } },
                { nameKo: { contains: parsedName, mode: "insensitive" } },
              ],
              id: { not: collabArtist.id },
            },
            select: {
              id: true,
              name: true,
              nameKo: true,
              _count: {
                select: { artistSongs: true },
              },
            },
            take: 10,
          });

          // 가장 비슷한 이름 찾기 (이름 길이 차이가 5자 이내)
          found =
            candidates.find((c) => {
              const targetName = c.nameKo || c.name;
              const lengthDiff = Math.abs(
                targetName.length - parsedName.length,
              );
              return (
                lengthDiff <= 5 &&
                (targetName.toLowerCase().includes(parsedName.toLowerCase()) ||
                  parsedName.toLowerCase().includes(targetName.toLowerCase()))
              );
            }) || null;
        }

        return found;
      }),
    );

    // 모든 파싱된 이름에 대해 실제 아티스트를 찾았는지 확인
    const foundArtists = realArtists.filter((a) => a !== null);
    if (foundArtists.length < 2) {
      continue;
    }

    // 실제 아티스트들의 곡 수가 협업 아티스트보다 많은지 확인
    const hasMoreSongs = foundArtists.every(
      (a) => a!._count.artistSongs > songCount,
    );
    if (!hasMoreSongs) {
      continue;
    }

    // 재매핑 대상 발견!
    console.log(`\n🎯 재매핑 대상 발견:`);
    console.log(
      `   협업: ${collabArtist.nameKo || collabArtist.name} (ID: ${collabArtist.id}, 곡: ${songCount}개)`,
    );
    foundArtists.forEach((a) => {
      console.log(
        `   → ${a!.nameKo || a!.name} (ID: ${a!.id}, 곡: ${a!._count.artistSongs}개)`,
      );
    });

    // 협업 아티스트의 모든 곡 가져오기
    const collaborationSongs = await prisma.artistSong.findMany({
      where: { artistId: collabArtist.id },
      select: { songId: true, role: true },
    });

    console.log(`   총 ${collaborationSongs.length}개 곡 재매핑 예정`);

    if (!isDryRun) {
      // 트랜잭션으로 재매핑 수행
      await prisma.$transaction(async (tx) => {
        for (const song of collaborationSongs) {
          // 각 실제 아티스트에게 곡 매핑 추가
          for (const realArtist of foundArtists) {
            // 이미 매핑이 있는지 확인
            const existing = await tx.artistSong.findUnique({
              where: {
                artistId_songId: {
                  artistId: realArtist!.id,
                  songId: song.songId,
                },
              },
            });

            if (!existing) {
              await tx.artistSong.create({
                data: {
                  artistId: realArtist!.id,
                  songId: song.songId,
                  order: song.order,
                  role: song.role,
                },
              });
              console.log(
                `     ✅ Song ID ${song.songId} → ${realArtist!.nameKo || realArtist!.name} 매핑 생성`,
              );
            } else {
              console.log(
                `     ⏭️  Song ID ${song.songId} → ${realArtist!.nameKo || realArtist!.name} 이미 매핑됨`,
              );
            }
          }
        }

        // 협업 아티스트와의 매핑 제거
        await tx.artistSong.deleteMany({
          where: { artistId: collabArtist.id },
        });
        console.log(`     🗑️  협업 아티스트 매핑 제거 완료`);
      });

      remappedCount++;
    }
  }

  console.log(`\n✅ 총 ${remappedCount}명의 협업 아티스트 재매핑 완료`);
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
