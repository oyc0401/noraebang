/**
 * 곡이 n개인 아티스트를 조회하는 스크립트
 *
 * pnpm ts-node src/scripts/artist/find-artists-by-song-count.ts
 * pnpm ts-node src/scripts/artist/find-artists-by-song-count.ts --count=0
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const countArg = process.argv
  .find((arg) => arg.startsWith("--count="))
  ?.replace("--count=", "");
const requestedCount = countArg ? Number.parseInt(countArg, 10) : 1;

if (Number.isNaN(requestedCount) || requestedCount < 0) {
  console.error("❌ count 값은 0 이상의 숫자여야 합니다.");
  process.exit(1);
}

type ArtistRow = {
  id: number;
  name: string;
  name_ko: string | null;
  slug: string | null;
  song_count: bigint;
};

async function findArtistsBySongCount() {
  console.log(
    `🔍 곡이 ${requestedCount}개인 아티스트를 조회합니다...\n(0개도 허용)`,
  );

  try {
    const artists = await prisma.$queryRaw<ArtistRow[]>`
      SELECT
        a.id,
        a.name,
        a.name_ko,
        a.slug,
        COUNT(asg.song_id) AS song_count
      FROM artist a
      LEFT JOIN artist_song asg ON a.id = asg.artist_id
      GROUP BY a.id, a.name, a.name_ko, a.slug
      HAVING COUNT(asg.song_id) = ${requestedCount}
      ORDER BY a.id ASC
    `;

    if (artists.length === 0) {
      console.log("✅ 조건에 맞는 아티스트가 없습니다.");
      return;
    }

    for (const artist of artists) {
      const songCount = Number(artist.song_count);
      console.log(
        `🎵 ${artist.name} (ID: ${artist.id}) - nameKo: ${
          artist.name_ko ?? "-"
        }, slug: ${artist.slug ?? "-"}, songs: ${songCount}`,
      );
    }

    console.log(`\n총 ${artists.length}명의 아티스트가 조건과 일치합니다.`);
  } catch (error) {
    console.error("❌ 조회 중 오류가 발생했습니다.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

findArtistsBySongCount();
