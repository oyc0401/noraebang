/**
 * artistSongs 에 연결된 아티스트가 하나도 없는 Song을 정리하는 스크립트
 *
 * 사용법:
 * pnpm ts-node src/scripts/song/delete-songs-without-artists.ts --dry-run
 * pnpm ts-node src/scripts/song/delete-songs-without-artists.ts
 *
 * - 기본적으로 Dry Run 없이 실행하면 실제 Song 레코드를 삭제합니다.
 * - KaraokeSong 이 연결되어 있는 곡은 FK 제약 때문에 삭제할 수 없으므로 자동으로 스킵합니다.
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

type OrphanSong = {
  id: number;
  title: string;
  titleKo: string | null;
  createdAt: Date;
  spotifyTrackGroup: { id: number } | null;
  _count: {
    karaokeSongs: number;
    aliases: number;
  };
};

function logSongPreview(prefix: string, songs: OrphanSong[]) {
  if (songs.length === 0) return;
  console.log(prefix);
  for (const song of songs.slice(0, 20)) {
    const aliasCount = song._count.aliases;
    const hasGroup = song.spotifyTrackGroup?.id ?? "none";
    console.log(
      `  - Song[${song.id}] "${song.title}" (titleKo=${song.titleKo ?? "-"}, aliases=${aliasCount}, group=${hasGroup})`,
    );
  }
  if (songs.length > 20) {
    console.log(`    ... 외 ${songs.length - 20}개`);
  }
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("===========================================");
  console.log("Delete Songs Without Artists");
  console.log("===========================================");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "APPLY"}`);
  console.log("");

  console.log("🔍 Loading orphan songs (no artistSongs) ...");
  const orphanSongs = await prisma.song.findMany({
    where: {
      artistSongs: {
        none: {},
      },
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      createdAt: true,
      spotifyTrackGroup: {
        select: { id: true },
      },
      _count: {
        select: {
          karaokeSongs: true,
          aliases: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  if (orphanSongs.length === 0) {
    console.log("✅ 아티스트가 없는 Song이 없습니다.");
    return;
  }

  console.log(`✓ Found ${orphanSongs.length} orphan songs`);

  const blockedByKaraoke = orphanSongs.filter(
    (song) => song._count.karaokeSongs > 0,
  );
  const deletable = orphanSongs.filter(
    (song) => song._count.karaokeSongs === 0,
  );

  if (blockedByKaraoke.length > 0) {
    logSongPreview(
      `\n⚠️  KaraokeSong이 연결되어 있어 삭제할 수 없는 곡: ${blockedByKaraoke.length}개`,
      blockedByKaraoke,
    );
  }

  if (deletable.length === 0) {
    console.log(
      "\n⏭️  삭제 가능한 곡이 없습니다 (모두 KaraokeSong에 연결되어 있음).",
    );
    return;
  }

  logSongPreview(
    `\n🗑️  삭제 대상 곡 (ArtistSong/ KaraokeSong 모두 없는 곡): ${deletable.length}개`,
    deletable,
  );

  if (isDryRun) {
    console.log("\n💡 DRY RUN - 실제 삭제는 수행되지 않습니다.");
    return;
  }

  const deleteIds = deletable.map((song) => song.id);
  const deleted = await prisma.song.deleteMany({
    where: {
      id: {
        in: deleteIds,
      },
    },
  });

  console.log(
    `\n✅ 삭제 완료: ${deleted.count}개의 곡이 ArtistSong 없이 존재하여 제거되었습니다.`,
  );
  if (blockedByKaraoke.length > 0) {
    console.log(
      "⚠️  KaraokeSong이 연결된 곡은 수동 검토 후 처리해 주세요 (위 목록 참고).",
    );
  }
}

main()
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 중 오류:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
