/**
 * 가장 최근에 생성된 SpotifyTrack의 연결된 로컬 Artist ID 조회 스크립트
 *
 * 동작:
 * - createdAt 기준 가장 마지막에 생성된 SpotifyTrack 1개 조회
 * - 해당 트랙과 연결된 SpotifyArtist → Artist 관계를 통해 Artist ID 목록 출력
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/get-latest-track-artist.ts
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

async function main() {
  console.log("📊 가장 마지막에 생성된 SpotifyTrack을 조회합니다...\n");

  const latestTrack = await prisma.spotifyTrack.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    include: {
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
              },
            },
          },
        },
      },
    },
  });

  if (!latestTrack) {
    console.log("❌ SpotifyTrack이 존재하지 않습니다.");
    return;
  }

  console.log(`🎵 최신 트랙 ID: ${latestTrack.id}`);
  console.log(`   제목: ${latestTrack.name}`);
  console.log(`   Spotify ID: ${latestTrack.spotifyId}`);
  console.log(`   생성일: ${latestTrack.createdAt.toISOString()}\n`);

  const artistIds = new Set<number>();
  const artistDetails: string[] = [];

  for (const artistTrack of latestTrack.artists) {
    const spotifyArtist = artistTrack.spotifyArtist;
    if (!spotifyArtist) continue;

    for (const artist of spotifyArtist.artists) {
      artistIds.add(artist.id);
      artistDetails.push(
        `- Artist ID ${artist.id}: ${artist.name} (${artist.nameKo ?? "KO 이름 없음"})`,
      );
    }
  }

  if (artistIds.size === 0) {
    console.log("⚠️  연결된 Artist가 없습니다.");
    return;
  }

  console.log(
    `✅ 최신 SpotifyTrack과 연결된 Artist ID (${artistIds.size}명):\n${artistDetails.join("\n")}`,
  );
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
