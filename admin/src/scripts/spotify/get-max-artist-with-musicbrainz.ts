/**
 * MusicBrainz ID가 있는 SpotifyTrack을 가진 Artist 중 가장 높은 artistId 출력
 *
 * 동작:
 * 1. SpotifyTrack 중 musicBrainzRecordingId가 있는 트랙 찾기
 * 2. 해당 트랙과 연결된 SpotifyArtist 찾기
 * 3. SpotifyArtist와 연결된 Artist 찾기
 * 4. 가장 높은 Artist.id 출력
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/get-max-artist-with-musicbrainz.ts
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
  console.log(
    "\n=== MusicBrainz ID가 있는 트랙을 가진 가장 높은 artistId 조회 ===\n",
  );

  // Artist 중에서 MusicBrainz ID가 있는 트랙을 가진 Artist 조회
  const artist = await prisma.artist.findFirst({
    where: {
      spotifyArtist: {
        tracks: {
          some: {
            spotifyTrack: {
              musicBrainzRecordingId: { not: null },
            },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
    },
    orderBy: {
      id: "desc",
    },
  });

  if (!artist) {
    console.log("❌ MusicBrainz ID가 있는 트랙을 가진 Artist가 없습니다.");
    return;
  }

  console.log(`✅ 가장 높은 Artist ID: ${artist.id}`);
  console.log(`   이름: ${artist.name} (${artist.nameKo})`);
  console.log(`   Spotify ID: ${artist.spotifyId}\n`);

  // 추가 정보: 해당 아티스트의 MusicBrainz 트랙 수
  const mbTrackCount = await prisma.spotifyTrack.count({
    where: {
      musicBrainzRecordingId: { not: null },
      artists: {
        some: {
          spotifyArtist: {
            artists: {
              some: {
                id: artist.id,
              },
            },
          },
        },
      },
    },
  });

  console.log(`   MusicBrainz ID가 있는 트랙 수: ${mbTrackCount}개\n`);
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
