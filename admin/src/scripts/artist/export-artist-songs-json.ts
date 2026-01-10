/**
 * 특정 아티스트의 Song 제목과 Spotify 곡 제목을 JSON으로 출력하는 스크립트
 *
 * 기능:
 * - artistId로 아티스트 조회
 * - Song 제목 배열 추출 (ArtistSong 관계를 통해)
 * - Spotify 곡 제목 배열 추출 (disabled=false만)
 * - JSON 형식으로 출력
 *
 * 사용법:
 * pnpm ts-node src/scripts/artist/export-artist-songs-json.ts <artistId>
 * pnpm ts-node src/scripts/artist/export-artist-songs-json.ts 123
 * pnpm ts-node src/scripts/artist/export-artist-songs-json.ts 123 > artist-songs.json
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
  const artistIdStr = process.argv[2];

  if (!artistIdStr) {
    console.error(
      "❌ Usage: pnpm ts-node src/scripts/artist/export-artist-songs-json.ts <artistId>",
    );
    console.error(
      "   Example: pnpm ts-node src/scripts/artist/export-artist-songs-json.ts 123",
    );
    process.exit(1);
  }

  const artistId = Number.parseInt(artistIdStr, 10);
  if (Number.isNaN(artistId)) {
    console.error("❌ Error: artistId must be a number");
    process.exit(1);
  }

  // 아티스트 조회
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      artistSongs: {
        select: {
          song: true,
        },
      },
      spotifyArtist: {
        select: {
          spotifyId: true,
          tracks: {
            select: {
              spotifyTrack: true,
            },
          },
        },
      },
    },
  });

  if (!artist) {
    console.error(`❌ Artist not found: ${artistId}`);
    process.exit(1);
  }

  // Song 제목 추출
  const songs = artist.artistSongs.map((as) => ({
    id: as.song.id,
    title: as.song.title,
    titleKo: as.song.titleKo,
  }));

  // Spotify 곡 제목 추출 (disabled=false만)
  const spotifyTracks =
    artist.spotifyArtist?.tracks
      .filter((track) => !track.spotifyTrack.disabled)
      .map((sat) => ({
        id: sat.spotifyTrack.id,
        title: sat.spotifyTrack.name,
        spotifyId: sat.spotifyTrack.spotifyId,
        isrc: sat.spotifyTrack.isrc,
        durationMs: sat.spotifyTrack.durationMs,
      })) ?? [];

  // JSON 형식으로 변환
  const result = {
    artist: {
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      spotifyId: artist.spotifyArtist?.spotifyId || null,
    },
    songs,
    spotifyTracks,
  };

  // JSON 출력 (pretty print)
  console.log(JSON.stringify(result, null, 2));
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
