/**
 * artistId 300~450 범위의 아티스트들 중에서
 * 각 아티스트의 SpotifyTrack 중 musicBrainzRecordingId가 있는 트랙 개수를 집계하여 JSON으로 출력
 *
 * 기능:
 * - artistId가 300 이상 450 이하인 아티스트 조회
 * - 각 아티스트의 SpotifyTrack 통계 집계
 * - JSON 형태로 출력
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/get-musicbrainz-stats.ts
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

interface ArtistMusicBrainzStats {
  artistId: number;
  artistName: string;
  artistNameKo: string;
  totalTracks: number;
  tracksWithMusicBrainzId: number;
  tracksWithMusicBrainzFetchedAt: number;
}

async function main() {
  console.log("📊 MusicBrainz 통계 조회 중...\n");

  // artistId가 300 이상 450 이하인 아티스트 중 SpotifyArtist가 있는 아티스트 조회
  const artists = await prisma.artist.findMany({
    where: {
      id: {
        gte: 300,
        lte: 450,
      },
      spotifyId: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyArtist: {
        select: {
          id: true,
          tracks: {
            select: {
              spotifyTrack: {
                select: {
                  id: true,
                  musicBrainzRecordingId: true,
                  musicBrainzFetchedAt: true,
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

  console.log(`✅ ${artists.length}개 아티스트 조회 완료\n`);

  const stats: ArtistMusicBrainzStats[] = [];

  for (const artist of artists) {
    if (!artist.spotifyArtist) {
      continue;
    }

    const tracks = artist.spotifyArtist.tracks.map((t) => t.spotifyTrack);
    const totalTracks = tracks.length;
    const tracksWithMusicBrainzId = tracks.filter(
      (t) => t.musicBrainzRecordingId !== null,
    ).length;
    const tracksWithMusicBrainzFetchedAt = tracks.filter(
      (t) => t.musicBrainzFetchedAt !== null,
    ).length;

    stats.push({
      artistId: artist.id,
      artistName: artist.name,
      artistNameKo: artist.nameKo,
      totalTracks,
      tracksWithMusicBrainzId,
      tracksWithMusicBrainzFetchedAt,
    });
  }

  console.log("📋 결과:\n");
  console.log(JSON.stringify(stats, null, 2));

  console.log("\n📊 요약:");
  console.log(`  전체 아티스트: ${stats.length}`);
  console.log(
    `  전체 트랙: ${stats.reduce((sum, s) => sum + s.totalTracks, 0)}`,
  );
  console.log(
    `  MusicBrainz ID 있는 트랙: ${stats.reduce((sum, s) => sum + s.tracksWithMusicBrainzId, 0)}`,
  );
  console.log(
    `  MusicBrainz 조회한 트랙: ${stats.reduce((sum, s) => sum + s.tracksWithMusicBrainzFetchedAt, 0)}`,
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
