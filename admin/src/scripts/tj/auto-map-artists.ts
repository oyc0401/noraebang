import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "@prisma/client";
import pg from "pg";

// TJ 곡의 artistList를 기반으로 Artist 생성 및 Song 매핑 (최적화 버전)
//
// 실행 흐름:
// 1. saved=false인 TjSong의 artistList 수집
// 2. 모든 Artist를 메모리에 로드 (캐싱)
// 3. 각 아티스트명에 대해:
//    - name 필드가 정확히 일치하는 Artist가 있는지 확인 (대소문자 구분)
//    - 있으면: 해당 Artist 사용
//    - 없으면: 새로운 Artist 생성 후 캐시 업데이트
// 4. Artist가 확정되면 해당 아티스트의 TjSong 매핑
//    - 배치로 KaraokeSong 조회 및 처리
//    - Song이 없으면 생성
//    - ArtistSong 매핑 생성
//    - TjSong.saved = true로 업데이트
//
// pnpm tsx src/scripts/tj/auto-map-artists.ts (dry-run)
// pnpm tsx src/scripts/tj/auto-map-artists.ts --force (실제 생성)
// pnpm tsx src/scripts/tj/auto-map-artists.ts --force --limit=10
// pnpm tsx src/scripts/tj/auto-map-artists.ts --force --include-saved --no-create-artist --no-create-song (기존 곡 핫픽스)

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type ArtistCacheEntry = {
  id: number;
  name: string;
  nameKo: string | null;
};

type MapOptions = {
  includeSavedSongs: boolean;
  allowSongCreation: boolean;
};

async function mapTjSongsToArtist(
  artistId: number,
  artistName: string,
  isDryRun: boolean,
  karaokeSongMap: Map<string, number>,
  artistMap: Map<string, ArtistCacheEntry>,
  options: MapOptions,
) {
  // 해당 아티스트명을 가진 TjSong 조회
  const tjSongWhere: Prisma.TjSongWhereInput = {
    artistList: {
      has: artistName,
    },
  };
  if (!options.includeSavedSongs) {
    tjSongWhere.saved = false;
  }

  const tjSongs = await prisma.tjSong.findMany({
    where: tjSongWhere,
    select: {
      id: true,
      title: true,
      artistList: true,
    },
  });

  if (tjSongs.length === 0) {
    return { mappedSongs: 0, createdSongs: 0 };
  }

  let createdSongs = 0;
  let mappedSongs = 0;

  if (isDryRun) {
    return { mappedSongs: tjSongs.length, createdSongs: 0 };
  }

  // 배치 처리를 위한 데이터 준비
  const songsToCreate: Array<{ tjSongId: string; title: string }> = [];
  const artistSongsToCreate: Array<{ artistId: number; songId: number }> = [];
  const touchedSongIds = new Set<string>();
  let skippedSongCreations = 0;

  for (const tjSong of tjSongs) {
    const existingSongId = karaokeSongMap.get(tjSong.id);

    if (existingSongId) {
      // 기존 Song이 있으면 ArtistSong 매핑만 추가
      artistSongsToCreate.push({ artistId, songId: existingSongId });
      touchedSongIds.add(tjSong.id);
      mappedSongs++;
    } else {
      if (!options.allowSongCreation) {
        skippedSongCreations++;
        continue;
      }
      // Song을 생성해야 함
      songsToCreate.push({ tjSongId: tjSong.id, title: tjSong.title });
      touchedSongIds.add(tjSong.id);
    }
  }

  // Song 배치 생성
  for (const songData of songsToCreate) {
    const createdSong = await prisma.song.create({
      data: {
        title: songData.title,
        titleKo: songData.title,
      },
    });

    await prisma.karaokeSong.create({
      data: {
        songId: createdSong.id,
        provider: "TJ",
        karaokeNo: songData.tjSongId,
      },
    });

    // 캐시 업데이트
    karaokeSongMap.set(songData.tjSongId, createdSong.id);

    artistSongsToCreate.push({ artistId, songId: createdSong.id });
    createdSongs++;
    mappedSongs++;
  }

  // ArtistSong 매핑 생성 (중복 방지)
  for (const mapping of artistSongsToCreate) {
    await prisma.artistSong.upsert({
      where: {
        artistId_songId: {
          artistId: mapping.artistId,
          songId: mapping.songId,
        },
      },
      update: {},
      create: {
        artistId: mapping.artistId,
        songId: mapping.songId,
      },
    });
  }

  const songsForCompletion = tjSongs.filter((song) =>
    touchedSongIds.has(song.id),
  );
  await markCompletedTjSongs(songsForCompletion, artistMap, karaokeSongMap);

  if (skippedSongCreations > 0) {
    console.log(
      `    ⚠️  Song 미보유로 스킵된 TJ 곡: ${skippedSongCreations}개 (song 생성 비활성화)`,
    );
  }

  return { mappedSongs, createdSongs };
}

async function markCompletedTjSongs(
  tjSongs: Array<{ id: string; artistList: string[] }>,
  artistMap: Map<string, ArtistCacheEntry>,
  karaokeSongMap: Map<string, number>,
) {
  if (tjSongs.length === 0) {
    return;
  }

  const candidateMap = new Map<
    string,
    { songId: number; requiredArtistIds: number[] }
  >();

  for (const tjSong of tjSongs) {
    const songId = karaokeSongMap.get(tjSong.id);
    if (!songId) continue;

    const requiredIds: number[] = [];
    let missingArtist = false;

    for (const name of tjSong.artistList) {
      if (!name) continue;
      const artist = artistMap.get(name);
      if (!artist) {
        missingArtist = true;
        break;
      }
      requiredIds.push(artist.id);
    }

    if (missingArtist || requiredIds.length === 0) {
      continue;
    }

    const uniqueRequiredIds = Array.from(new Set(requiredIds));
    candidateMap.set(tjSong.id, { songId, requiredArtistIds: uniqueRequiredIds });
  }

  if (candidateMap.size === 0) {
    return;
  }

  const songIds = Array.from(
    new Set(Array.from(candidateMap.values()).map((entry) => entry.songId)),
  );
  const artistSongRows = await prisma.artistSong.findMany({
    where: {
      songId: {
        in: songIds,
      },
    },
    select: {
      songId: true,
      artistId: true,
    },
  });

  const songArtistMap = new Map<number, Set<number>>();
  for (const row of artistSongRows) {
    if (!songArtistMap.has(row.songId)) {
      songArtistMap.set(row.songId, new Set());
    }
    songArtistMap.get(row.songId)!.add(row.artistId);
  }

  const completedTjSongIds: string[] = [];
  for (const [tjSongId, requirement] of candidateMap.entries()) {
    const mappedArtistIds = songArtistMap.get(requirement.songId);
    if (!mappedArtistIds) continue;

    const allMapped = requirement.requiredArtistIds.every((artistId) =>
      mappedArtistIds.has(artistId),
    );
    if (allMapped) {
      completedTjSongIds.push(tjSongId);
    }
  }

  if (completedTjSongIds.length === 0) {
    return;
  }

  await prisma.tjSong.updateMany({
    where: {
      id: {
        in: completedTjSongIds,
      },
    },
    data: { saved: true },
  });
}

async function main() {
  const isForce = process.argv.includes("--force");
  const isDryRun = !isForce;
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1]) : undefined;
  const includeSavedSongs = process.argv.includes("--include-saved");
  const disableArtistCreation = process.argv.includes("--no-create-artist");
  const disableSongCreation = process.argv.includes("--no-create-song");

  const mapOptions: MapOptions = {
    includeSavedSongs,
    allowSongCreation: !disableSongCreation,
  };

  console.log("🎵 TJ 아티스트 자동 생성 및 매핑 시작 (최적화 버전)");
  console.log(`Mode: ${isDryRun ? "DRY RUN" : "FORCE (실제 생성)"}`);
  if (limit) {
    console.log(`Limit: ${limit}명`);
  }
  console.log(
    `Include saved TJ songs: ${includeSavedSongs ? "YES" : "NO (saved=false만 처리)"}`,
  );
  if (disableArtistCreation) {
    console.log("Artist creation: DISABLED (--no-create-artist)");
  }
  if (disableSongCreation) {
    console.log("Song creation: DISABLED (--no-create-song)");
  }
  console.log("");

  // 0. 모든 Artist를 메모리에 로드 (캐싱)
  console.log("Step 0: Artist 캐시 로딩 중...");
  const allArtists = await prisma.artist.findMany({
    select: {
      id: true,
      name: true,
      nameKo: true,
    },
  });
  const artistMap = new Map<string, ArtistCacheEntry>();
  for (const artist of allArtists) {
    artistMap.set(artist.name, artist);
  }
  console.log(`  ✅ ${artistMap.size.toLocaleString()}명의 Artist 로드 완료`);
  console.log("");

  // 0-1. KaraokeSong 캐시 로딩
  console.log("Step 0-1: KaraokeSong 캐시 로딩 중...");
  const allKaraokeSongs = await prisma.karaokeSong.findMany({
    where: {
      provider: "TJ",
    },
    select: {
      karaokeNo: true,
      songId: true,
    },
  });
  const karaokeSongMap = new Map<string, number>();
  for (const ks of allKaraokeSongs) {
    karaokeSongMap.set(ks.karaokeNo, ks.songId);
  }
  console.log(`  ✅ ${karaokeSongMap.size.toLocaleString()}개의 KaraokeSong 로드 완료`);
  console.log("");

  // 1. saved=false인 TjSong의 artistList 수집
  console.log("Step 1: 저장되지 않은 TjSong의 아티스트 수집 중...");

  const savedFilter = includeSavedSongs
    ? Prisma.sql``
    : Prisma.sql`WHERE saved = false`;

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
      ${savedFilter}
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

    // 캐시에서 확인 (대소문자 구분)
    const exactArtist = artistMap.get(artistName);

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
        karaokeSongMap,
        artistMap,
        mapOptions,
      );
      totalMappedSongs += stats.mappedSongs;
      totalCreatedSongs += stats.createdSongs;
      continue;
    }

    if (disableArtistCreation) {
      console.log(
        `  ⚠️  [SKIP] ${artistName} - Artist 생성 비활성화 (--no-create-artist)`,
      );
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
      const tjSongWhere: Prisma.TjSongWhereInput = {
        artistList: {
          has: artistName,
        },
      };
      if (!includeSavedSongs) {
        tjSongWhere.saved = false;
      }
      const tjSongs = await prisma.tjSong.findMany({
        where: tjSongWhere,
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

    // 캐시 업데이트
    artistMap.set(artistName, {
      id: newArtist.id,
      name: newArtist.name,
      nameKo: newArtist.nameKo,
    });

    console.log(
      `  ✨ [CREATE] ${artistName} (ID: ${newArtist.id}) - ${songCount}곡`,
    );

    // 매핑
    const stats = await mapTjSongsToArtist(
      newArtist.id,
      artistName,
      isDryRun,
      karaokeSongMap,
      artistMap,
      mapOptions,
    );
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
