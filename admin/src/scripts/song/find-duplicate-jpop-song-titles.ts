/**
 * JPOP 중 동일한 title을 가지는 Song 출력 스크립트
 *
 * 목적:
 * - Song 테이블에서 catalog가 JPOP인 곡 중 동일한 title을 가진 곡들을 전부 출력
 * - 중복 title별로 Song ID, title, titleKo, catalog, visible, artist 정보를 함께 출력
 *
 * 사용법:
 * pnpm ts-node src/scripts/song/find-duplicate-jpop-song-titles.ts
 * pnpm ts-node src/scripts/song/find-duplicate-jpop-song-titles.ts --visible-only
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

const TARGET_CATALOG = "JPOP";

interface DuplicateTitleGroup {
  title: string;
  count: number;
}

interface SongInfo {
  id: number;
  title: string;
  titleKo: string | null;
  titleJa: string | null;
  titleJaKanji: string | null;
  titleJaKana: string | null;
  titleLatin: string | null;
  catalog: string | null;
  tjSongId: string | null;
  visible: boolean;
  artists: Array<{
    id: number;
    name: string;
    nameKo: string;
  }>;
}

async function fetchDuplicateTitleGroups(
  visibleOnly: boolean,
): Promise<DuplicateTitleGroup[]> {
  const groups = await prisma.song.groupBy({
    by: ["title"],
    where: {
      catalog: TARGET_CATALOG,
      ...(visibleOnly ? { visible: true } : {}),
    },
    _count: {
      _all: true,
    },
    having: {
      title: {
        _count: {
          gt: 1,
        },
      },
    },
    orderBy: [
      {
        _count: {
          title: "desc",
        },
      },
      {
        title: "asc",
      },
    ],
  });

  return groups.map((group) => ({
    title: group.title,
    count: group._count._all,
  }));
}

async function fetchSongsByTitle(
  title: string,
  visibleOnly: boolean,
): Promise<SongInfo[]> {
  const songs = await prisma.song.findMany({
    where: {
      title,
      catalog: TARGET_CATALOG,
      ...(visibleOnly ? { visible: true } : {}),
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleJa: true,
      titleJaKanji: true,
      titleJaKana: true,
      titleLatin: true,
      catalog: true,
      tjSongId: true,
      visible: true,
      artistSongs: {
        select: {
          artist: {
            select: {
              id: true,
              name: true,
              nameKo: true,
            },
          },
        },
        orderBy: {
          artistId: "asc",
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  return songs.map((song) => ({
    id: song.id,
    title: song.title,
    titleKo: song.titleKo,
    titleJa: song.titleJa,
    titleJaKanji: song.titleJaKanji,
    titleJaKana: song.titleJaKana,
    titleLatin: song.titleLatin,
    catalog: song.catalog,
    tjSongId: song.tjSongId,
    visible: song.visible,
    artists: song.artistSongs.map((artistSong) => ({
      id: artistSong.artist.id,
      name: artistSong.artist.name,
      nameKo: artistSong.artist.nameKo,
    })),
  }));
}

function formatArtists(song: SongInfo) {
  if (song.artists.length === 0) {
    return "-";
  }

  return song.artists
    .map((artist) => `[${artist.id}] ${artist.nameKo || artist.name}`)
    .join(", ");
}

function printSong(song: SongInfo) {
  console.log(`   [Song ${song.id}] "${song.title}"`);
  console.log(`      titleKo: ${song.titleKo ?? "-"}`);
  console.log(`      titleJa: ${song.titleJa ?? "-"}`);
  console.log(`      titleJaKanji: ${song.titleJaKanji ?? "-"}`);
  console.log(`      titleJaKana: ${song.titleJaKana ?? "-"}`);
  console.log(`      titleLatin: ${song.titleLatin ?? "-"}`);
  console.log(`      catalog: ${song.catalog ?? "-"}`);
  console.log(`      tjSongId: ${song.tjSongId ?? "-"}`);
  console.log(`      visible: ${song.visible}`);
  console.log(`      artists: ${formatArtists(song)}`);
}

async function main() {
  const args = process.argv.slice(2);
  const visibleOnly = args.includes("--visible-only");

  console.log("\n🚀 JPOP 중복 Song title 조회 스크립트 시작");
  console.log(`🎯 Target catalog: ${TARGET_CATALOG}`);
  if (visibleOnly) console.log("👀 visible=true 곡만 조회");
  console.log();

  try {
    const duplicateGroups = await fetchDuplicateTitleGroups(visibleOnly);

    console.log(`📋 중복 title 그룹 수: ${duplicateGroups.length}`);

    const totalDuplicateSongs = duplicateGroups.reduce(
      (sum, group) => sum + group.count,
      0,
    );

    console.log(
      `🎵 중복 title에 포함된 JPOP Song 수: ${totalDuplicateSongs}\n`,
    );

    if (duplicateGroups.length === 0) {
      console.log("✅ JPOP 중 동일한 title을 가진 Song이 없습니다.");
      return;
    }

    for (const group of duplicateGroups) {
      const songs = await fetchSongsByTitle(group.title, visibleOnly);

      console.log(
        `\n==================== "${group.title}" (${group.count}개) ====================`,
      );

      for (const song of songs) {
        printSong(song);
      }
    }

    console.log("\n==================== [SUMMARY] ====================");
    console.log(`🎯 Catalog: ${TARGET_CATALOG}`);
    console.log(`📋 Duplicate title groups: ${duplicateGroups.length}`);
    console.log(`🎵 Songs in duplicate groups: ${totalDuplicateSongs}`);
    console.log("=".repeat(55));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);

  prisma.$disconnect();
  pool.end();

  process.exit(1);
});
