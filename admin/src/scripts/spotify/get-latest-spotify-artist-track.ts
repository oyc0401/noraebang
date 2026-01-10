/**
 * 가장 최근에 생성된 SpotifyArtistTrack 정보 출력 스크립트
 *
 * 기능:
 * - 가장 높은 ID를 가진 SpotifyArtistTrack 조회
 * - 해당 매핑의 아티스트와 트랙 정보 출력
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/get-latest-spotify-artist-track.ts
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
  console.log(`\n=== 가장 최근 SpotifyArtistTrack 매핑 정보 ===\n`);

  // 가장 높은 ID를 가진 SpotifyArtistTrack 조회
  const latestMapping = await prisma.spotifyArtistTrack.findFirst({
    orderBy: { id: "desc" },
    include: {
      spotifyArtist: {
        select: {
          id: true,
          name: true,
          spotifyId: true,
          artist: {
            select: {
              id: true,
              name: true,
              nameKo: true,
            },
          },
        },
      },
      spotifyTrack: {
        select: {
          id: true,
          name: true,
          spotifyId: true,
          popularity: true,
          releaseDate: true,
        },
      },
    },
  });

  if (!latestMapping) {
    console.log("⚠️  SpotifyArtistTrack 매핑이 없습니다.\n");
    return;
  }

  console.log("━".repeat(80));
  console.log(`SpotifyArtistTrack ID: ${latestMapping.id}`);
  console.log(`생성일: ${latestMapping.createdAt.toISOString()}`);
  console.log("━".repeat(80));

  console.log(`\n아티스트:`);
  console.log(`  SpotifyArtist ID: ${latestMapping.spotifyArtist.id}`);
  console.log(`  이름: ${latestMapping.spotifyArtist.name}`);
  console.log(`  Spotify ID: ${latestMapping.spotifyArtist.spotifyId}`);
  if (latestMapping.spotifyArtist.artist) {
    console.log(`  Artist ID: ${latestMapping.spotifyArtist.artist.id}`);
    console.log(
      `  Artist 이름: ${latestMapping.spotifyArtist.artist.name} (${latestMapping.spotifyArtist.artist.nameKo})`,
    );
  } else {
    console.log(`  Artist ID: (매핑 안됨)`);
  }

  console.log(`\n트랙:`);
  console.log(`  SpotifyTrack ID: ${latestMapping.spotifyTrack.id}`);
  console.log(`  곡명: ${latestMapping.spotifyTrack.name}`);
  console.log(`  Spotify ID: ${latestMapping.spotifyTrack.spotifyId}`);
  console.log(`  인기도: ${latestMapping.spotifyTrack.popularity || "N/A"}`);
  console.log(`  발매일: ${latestMapping.spotifyTrack.releaseDate || "N/A"}`);

  console.log();
}

main()
  .catch((error) => {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
