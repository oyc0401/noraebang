/**
 * Artist ID가 MIN_ARTIST_ID 이상인 SpotifyTrack을 그룹에서 제거하는 스크립트
 *
 * 동작:
 * - Artist ID가 400 이상인 Artist가 포함된 SpotifyTrack을 조회
 * - groupId를 null로 만들어 그룹에서 제거
 * - 제거하려는 트랙이 그룹의 primary라면 primarySpotifyTrackId를 null로 설정
 * - dry-run 모드로 시뮬레이션 가능
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/remove-high-artist-tracks-from-group.ts
 * pnpm ts-node src/scripts/spotify/remove-high-artist-tracks-from-group.ts --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const MIN_ARTIST_ID = 428;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 [DRY RUN MODE] 실제 DB 업데이트는 수행하지 않습니다.\n");
  }

  console.log(
    `📊 Artist ID ≥ ${MIN_ARTIST_ID} 조건을 만족하는 SpotifyTrack을 조회합니다...\n`,
  );

  const targetTracks = await prisma.spotifyTrack.findMany({
    where: {
      groupId: {
        not: null,
      },
      artists: {
        some: {
          spotifyArtist: {
            artists: {
              some: {
                id: {
                  gte: MIN_ARTIST_ID,
                },
              },
            },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      spotifyId: true,
      groupId: true,
      group: {
        select: {
          id: true,
          titleKo: true,
          titleLatin: true,
          primarySpotifyTrackId: true,
        },
      },
      primaryForGroup: {
        select: {
          id: true,
          titleKo: true,
          titleLatin: true,
        },
      },
      artists: {
        select: {
          spotifyArtist: {
            select: {
              id: true,
              name: true,
              artists: {
                select: {
                  id: true,
                  name: true,
                  nameKo: true,
                },
                where: {
                  id: {
                    gte: MIN_ARTIST_ID,
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  if (targetTracks.length === 0) {
    console.log("✅ 조건을 만족하는 트랙이 없습니다. 종료합니다.");
    return;
  }

  console.log(`✅ 대상 트랙: ${targetTracks.length}개 발견\n`);

  let updatedCount = 0;
  let primaryClearedCount = 0;

  for (let i = 0; i < targetTracks.length; i++) {
    const track = targetTracks[i];
    const progress = `[${i + 1}/${targetTracks.length}]`;

    const artistSummaries = track.artists
      .flatMap((artistTrack) => artistTrack.spotifyArtist.artists)
      .filter((artist) => artist.id >= MIN_ARTIST_ID)
      .map(
        (artist) =>
          `${artist.name}(${artist.nameKo ?? "미상"}) - Artist ID: ${artist.id}`,
      );

    console.log(`${progress} 트랙 ID: ${track.id}`);
    // console.log(`     그룹 ID: ${track.groupId ?? "없음"}`);
    if (track.group) {
      // console.log(
      //   `     그룹명: ${track.group.titleKo ?? track.group.titleLatin ?? "미상"}`,
      // );
    }
    if (artistSummaries.length > 0) {
      // console.log(`     관련 Artist (ID ≥ ${MIN_ARTIST_ID}):`);
      // artistSummaries.forEach((summary) => console.log(`       - ${summary}`));
    }

    const isPrimary = Boolean(track.primaryForGroup);
    if (isPrimary) {
      // console.log(
      //   `     ⚠️  이 트랙은 그룹 ${track.primaryForGroup?.id}의 primary 입니다.`,
      // );
    }

    if (isDryRun) {
      console.log(
        `     🔍 [DRY RUN] ${
          isPrimary ? "primary 해제 및 " : ""
        }groupId를 null로 설정합니다.\n`,
      );
      if (isPrimary) {
        primaryClearedCount++;
      }
      updatedCount++;
      continue;
    }

    if (isPrimary && track.primaryForGroup) {
      await prisma.spotifyTrackGroup.update({
        where: {
          id: track.primaryForGroup.id,
        },
        data: {
          primarySpotifyTrackId: null,
        },
      });
      // console.log(
      //   `     ✅ 그룹 ${track.primaryForGroup.id}의 primarySpotifyTrackId를 null로 설정했습니다.`,
      // );
      primaryClearedCount++;
    }

    await prisma.spotifyTrack.update({
      where: {
        id: track.id,
      },
      data: {
        groupId: null,
      },
    });

    // console.log("     ✅ groupId를 null로 설정했습니다.\n");
    updatedCount++;
  }

  console.log(`${"=".repeat(50)}`);
  console.log("📊 실행 결과");
  console.log(`  ✅ groupId 해제된 트랙: ${updatedCount}`);
  console.log(`  ⚠️  primary 초기화된 그룹: ${primaryClearedCount}`);
  console.log(`${"=".repeat(50)}\n`);
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
