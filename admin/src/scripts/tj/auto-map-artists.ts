import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// TJ 곡의 artistList를 기반으로 Artist 생성 및 Song 매핑
//
// 실행 흐름:
// 1. saved=false인 TjSong의 artistList 수집
// 2. 각 아티스트명에 대해:
//    - 정확히 일치하는 Artist가 있는지 확인 (대소문자 구분)
//    - 있으면: 해당 Artist 사용
//    - 없으면: 새로운 Artist 생성
// 3. Artist가 확정되면 해당 아티스트의 TjSong 매핑
//    - Song이 없으면 생성
//    - ArtistSong 매핑 생성
//    - TjSong.saved = true로 업데이트
//
// pnpm tsx src/scripts/tj/auto-map-artists.ts (dry-run)
// pnpm tsx src/scripts/tj/auto-map-artists.ts --force (실제 생성)
// pnpm tsx src/scripts/tj/auto-map-artists.ts --force --limit=10

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkExactArtist(name: string) {
  // 대소문자 구분하여 name 필드만 정확히 일치하는 Artist 찾기
  const artist = await prisma.artist.findFirst({
    where: {
      name: { equals: name },
    },
    select: {
      id: true,
      name: true,
      nameKo: true,
    },
  });

  return artist;
}


async function mapTjSongsToArtist(
  artistId: number,
  artistName: string,
  isDryRun: boolean,
) {
  // 해당 아티스트명을 가진 TjSong 조회
  const tjSongs = await prisma.tjSong.findMany({
    where: {
      artistList: {
        has: artistName,
      },
      saved: false,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (tjSongs.length === 0) {
    return { mappedSongs: 0, createdSongs: 0 };
  }

  let createdSongs = 0;
  let mappedSongs = 0;

  for (const tjSong of tjSongs) {
    if (isDryRun) {
      mappedSongs++;
      continue;
    }

    // KaraokeSong이 있는지 확인
    const existingKaraoke = await prisma.karaokeSong.findUnique({
      where: {
        provider_karaokeNo: {
          provider: "TJ",
          karaokeNo: tjSong.id,
        },
      },
      select: {
        songId: true,
      },
    });

    let songId: number | undefined = existingKaraoke?.songId;

    // Song이 없으면 생성
    if (!songId) {
      const createdSong = await prisma.song.create({
        data: {
          title: tjSong.title,
          titleKo: tjSong.title,
        },
      });

      await prisma.karaokeSong.create({
        data: {
          songId: createdSong.id,
          provider: "TJ",
          karaokeNo: tjSong.id,
        },
      });

      songId = createdSong.id;
      createdSongs += 1;
    }

    // ArtistSong 매핑 생성
    await prisma.artistSong.upsert({
      where: {
        artistId_songId: {
          artistId,
          songId,
        },
      },
      update: {},
      create: {
        artistId,
        songId,
      },
    });

    mappedSongs += 1;
  }

  // TjSong.saved = true로 업데이트
  if (!isDryRun) {
    await prisma.tjSong.updateMany({
      where: {
        id: {
          in: tjSongs.map((s) => s.id),
        },
      },
      data: { saved: true },
    });
  }

  return { mappedSongs, createdSongs };
}

async function main() {
  const isForce = process.argv.includes("--force");
  const isDryRun = !isForce;
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1]) : undefined;

  console.log("🎵 TJ 아티스트 자동 생성 및 매핑 시작");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "FORCE (실제 생성)"}`);
  if (limit) {
    console.log(`Limit: ${limit}명`);
  }
  console.log("");

  // 1. saved=false인 TjSong의 artistList 수집
  console.log("Step 1: 저장되지 않은 TjSong의 아티스트 수집 중...");

  const allUnsavedArtists = await prisma.$queryRaw<
    Array<{
      artist_name: string;
      song_count: bigint;
    }>
  >`
    SELECT
      artist_name,
      COUNT(*) as song_count
    FROM (
      SELECT UNNEST(artist_list) as artist_name
      FROM tj_song
      WHERE saved = false
    ) as artists
    WHERE artist_name IS NOT NULL AND artist_name <> ''
    GROUP BY artist_name
    ORDER BY song_count DESC, artist_name ASC
  `;

  const unsavedArtists = limit
    ? allUnsavedArtists.slice(0, limit)
    : allUnsavedArtists;

  console.log(
    `  ✅ ${unsavedArtists.length.toLocaleString()}명의 아티스트 발견`,
  );
  console.log("");

  if (unsavedArtists.length === 0) {
    console.log("ℹ️  처리할 아티스트가 없습니다.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  let processed = 0;
  let created = 0;
  let existed = 0;
  let totalMappedSongs = 0;
  let totalCreatedSongs = 0;

  // 2. 각 아티스트 처리
  console.log("Step 2: 아티스트 생성 및 매핑 중...");
  console.log("");

  for (const row of unsavedArtists) {
    processed++;
    const artistName = row.artist_name;
    const songCount = Number(row.song_count);

    // 정확히 일치하는 Artist 확인 (대소문자 구분)
    const exactArtist = await checkExactArtist(artistName);

    if (exactArtist) {
      // 정확히 일치하는 Artist가 있으면 사용
      existed++;

      console.log(
        `  ✅ [EXIST] ${artistName} (ID: ${exactArtist.id}) - ${songCount}곡`,
      );

      // 매핑
      const stats = await mapTjSongsToArtist(
        exactArtist.id,
        artistName,
        isDryRun,
      );
      totalMappedSongs += stats.mappedSongs;
      totalCreatedSongs += stats.createdSongs;
      continue;
    }

    // Artist 생성
    created++;

    if (isDryRun) {
      if (processed <= 10) {
        console.log(
          `  [DRY RUN] Would create Artist: ${artistName} - ${songCount}곡`,
        );
      }
      // dry-run에서도 매핑 카운트를 위해 계산
      const tjSongs = await prisma.tjSong.findMany({
        where: {
          artistList: {
            has: artistName,
          },
          saved: false,
        },
        select: {
          id: true,
        },
      });
      totalMappedSongs += tjSongs.length;
      continue;
    }

    const newArtist = await prisma.artist.create({
      data: {
        name: artistName,
        nameKo: artistName,
      },
    });

    if (processed <= 10) {
      console.log(
        `  ✨ [CREATE] ${artistName} (ID: ${newArtist.id}) - ${songCount}곡`,
      );
    }

    // 매핑
    const stats = await mapTjSongsToArtist(newArtist.id, artistName, isDryRun);
    totalMappedSongs += stats.mappedSongs;
    totalCreatedSongs += stats.createdSongs;
  }

  console.log("\n");
  console.log("✨ 완료!");
  console.log(`총 처리: ${processed.toLocaleString()}명`);
  console.log(
    `생성: ${created.toLocaleString()}명 (${((created / processed) * 100).toFixed(1)}%)`,
  );
  console.log(
    `기존 사용: ${existed.toLocaleString()}명 (${((existed / processed) * 100).toFixed(1)}%)`,
  );
  console.log(`매핑된 곡: ${totalMappedSongs.toLocaleString()}곡`);
  console.log(`생성된 Song: ${totalCreatedSongs.toLocaleString()}개`);

  if (isDryRun) {
    console.log("");
    console.log(
      "💡 실제로 생성하려면 --force 옵션을 사용하세요: pnpm tsx src/scripts/tj/auto-map-artists.ts --force",
    );
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
