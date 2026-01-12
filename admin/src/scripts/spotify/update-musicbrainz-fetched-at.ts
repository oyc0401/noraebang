/**
 * Artist ID가 300 이하인 Artist의 SpotifyTrack들의 musicBrainzFetchedAt을 현재 시간으로 업데이트하는 스크립트
 *
 * 기능:
 * - Artist ID가 300 이하이며 SpotifyArtist와 연결된 트랙 조회
 * - 해당 트랙들의 musicBrainzFetchedAt을 현재 시간으로 일괄 업데이트
 * - dry-run 모드 지원
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/update-musicbrainz-fetched-at.ts
 * pnpm ts-node src/scripts/spotify/update-musicbrainz-fetched-at.ts --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const MAX_ARTIST_ID = 429;

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 [DRY RUN MODE] 실제 DB 업데이트는 수행하지 않습니다.\n");
  }

  console.log(
    `📊 Artist ID가 ${MAX_ARTIST_ID} 이하인 Artist와 연결된 트랙 조회 중...\n`,
  );

  const trackFilter = {
    artists: {
      some: {
        spotifyArtist: {
          artists: {
            some: {
              id: {
                lte: MAX_ARTIST_ID,
              },
            },
          },
        },
      },
    },
  };

  // Artist ID 조건을 만족하는 트랙 조회
  const tracksForArtists = await prisma.spotifyTrack.findMany({
    where: trackFilter,
    select: {
      id: true,
      spotifyId: true,
      name: true,
      musicBrainzFetchedAt: true,
      artists: {
        select: {
          spotifyArtist: {
            select: {
              artists: {
                where: {
                  id: {
                    lte: MAX_ARTIST_ID,
                  },
                },
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  console.log(`✅ ${tracksForArtists.length}개 트랙 발견\n`);

  if (tracksForArtists.length === 0) {
    console.log("⚠️  업데이트할 트랙이 없습니다.");
    return;
  }

  // 관련 Artist 수 집계
  const relatedArtistIds = new Set<number>();
  for (const track of tracksForArtists) {
    for (const artistTrack of track.artists) {
      for (const artist of artistTrack.spotifyArtist.artists) {
        relatedArtistIds.add(artist.id);
      }
    }
  }

  console.log(
    `🎤 조건에 해당하는 Artist 수: ${relatedArtistIds.size}명 (ID ≤ ${MAX_ARTIST_ID})\n`,
  );

  // 현재 시간
  const now = new Date();

  console.log(`🕐 업데이트 시간: ${now.toISOString()}\n`);

  if (isDryRun) {
    console.log("🔍 [DRY RUN] 다음 트랙들이 업데이트됩니다:");
    for (let i = 0; i < Math.min(10, tracksForArtists.length); i++) {
      const track = tracksForArtists[i];
      const artistSummaries = track.artists
        .flatMap((artistTrack) => artistTrack.spotifyArtist.artists)
        .map((artist) => `${artist.name} (ID: ${artist.id})`);

      console.log(
        `  [${i + 1}] ${track.name} (Track ID: ${track.id}, Spotify ID: ${track.spotifyId})`,
      );
      console.log(
        `        관련 Artist: ${
          artistSummaries.length > 0 ? artistSummaries.join(", ") : "없음"
        }`,
      );
    }
    if (tracksForArtists.length > 10) {
      console.log(`  ... 외 ${tracksForArtists.length - 10}개`);
    }
    console.log(
      `\n✅ [DRY RUN] 총 ${tracksForArtists.length}개 트랙이 업데이트될 예정입니다.`,
    );
  } else {
    console.log("🔄 업데이트 시작...\n");

    // 일괄 업데이트
    const result = await prisma.spotifyTrack.updateMany({
      where: trackFilter,
      data: {
        musicBrainzFetchedAt: now,
      },
    });

    console.log(`✅ 업데이트 완료: ${result.count}개 트랙`);
  }
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
