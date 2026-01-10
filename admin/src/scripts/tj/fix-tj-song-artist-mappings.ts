/**
 * saved=true로 표시됐지만 모든 아티스트 매핑이 완료되지 않은 TJ 곡을 복구하는 스크립트
 *
 * pnpm ts-node src/scripts/tj/fix-tj-song-artist-mappings.ts        (dry-run)
 * pnpm ts-node src/scripts/tj/fix-tj-song-artist-mappings.ts --force (실제 수정)
 * pnpm ts-node src/scripts/tj/fix-tj-song-artist-mappings.ts --force --limit=100
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

type CandidateRow = {
  tj_song_id: string;
  song_id: number;
  title: string;
  artist_list: string[];
};

type ArtistCacheEntry = {
  id: number;
  name: string;
  nameKo: string | null;
};

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const isForce = process.argv.includes("--force");
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : 200;

if (Number.isNaN(limit) || limit <= 0) {
  console.error("❌ --limit 값이 잘못되었습니다.");
  process.exit(1);
}

async function loadArtistCache() {
  const artists = await prisma.artist.findMany({
    select: {
      id: true,
      name: true,
      nameKo: true,
    },
  });

  const cache = new Map<string, ArtistCacheEntry>();
  for (const artist of artists) {
    cache.set(artist.name, artist);
  }
  return cache;
}

async function findBrokenTjSongs() {
  return prisma.$queryRaw<CandidateRow[]>`
    WITH candidate AS (
      SELECT
        ts.id as tj_song_id,
        ts.title,
        ts.artist_list,
        ks.song_id,
        COUNT(DISTINCT normalized.trimmed_name) FILTER (
          WHERE normalized.trimmed_name <> ''
        ) AS required_artist_count,
        COUNT(DISTINCT normalized.trimmed_name) FILTER (
          WHERE normalized.trimmed_name <> ''
            AND a.id IS NOT NULL
            AND aso.id IS NOT NULL
        ) AS mapped_artist_count
      FROM tj_song ts
      INNER JOIN karaoke_song ks
        ON ks.karaoke_no = ts.id
       AND ks.provider = 'TJ'
      CROSS JOIN LATERAL UNNEST(COALESCE(ts.artist_list, ARRAY[]::text[])) AS names(artist_name)
      CROSS JOIN LATERAL (
        SELECT TRIM(BOTH FROM COALESCE(names.artist_name, '')) AS trimmed_name
      ) AS normalized
      LEFT JOIN artist a ON a.name = normalized.trimmed_name
      LEFT JOIN artist_song aso ON aso.artist_id = a.id AND aso.song_id = ks.song_id
      WHERE ts.saved = true
      GROUP BY ts.id, ts.title, ts.artist_list, ks.song_id
    )
    SELECT tj_song_id, title, artist_list, song_id
    FROM candidate
    WHERE required_artist_count > 0
      AND mapped_artist_count < required_artist_count
    ORDER BY tj_song_id ASC
    LIMIT ${limit}
  `;
}

async function buildArtistSongCache(songIds: number[]) {
  if (songIds.length === 0) {
    return new Map<number, Set<number>>();
  }

  const rows = await prisma.artistSong.findMany({
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

  const map = new Map<number, Set<number>>();
  for (const row of rows) {
    if (!map.has(row.songId)) {
      map.set(row.songId, new Set());
    }
    map.get(row.songId)!.add(row.artistId);
  }
  return map;
}

async function main() {
  console.log("🎯 TJ saved=true 곡의 누락된 아티스트 매핑을 점검합니다.");
  console.log(`Mode: ${isForce ? "FORCE (실제 수정)" : "DRY RUN"}`);
  console.log(`Limit: ${limit}곡\n`);

  const artistCache = await loadArtistCache();
  console.log(
    `📦 Artist 캐시 로딩 완료: ${artistCache.size.toLocaleString()}명`,
  );

  console.log("🧮 saved=true 상태 곡에서 누락된 매핑을 검색 중...");
  const candidates = await findBrokenTjSongs();
  console.log(
    `🔍 저장된 TJ 곡 점검 완료 (후보 ${candidates.length.toLocaleString()}곡)\n`,
  );

  if (candidates.length === 0) {
    console.log("✅ 복구가 필요한 곡이 없습니다.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log(
    `⚠️ ${candidates.length}개의 곡에서 불완전한 매핑을 발견했습니다.\n`,
  );

  const songIds = Array.from(new Set(candidates.map((row) => row.song_id)));
  console.log(
    `🗂️  후보 곡의 Song ID ${songIds.length.toLocaleString()}개에 대한 ArtistSong 캐시 준비 중...`,
  );
  const artistSongCache = await buildArtistSongCache(songIds);
  console.log(
    `🎼 Song-Artist 캐시 구성 완료: ${artistSongCache.size.toLocaleString()}곡`,
  );

  let totalCreatedArtists = 0;
  let totalCreatedMappings = 0;

  for (const candidate of candidates) {
    const artistNames = candidate.artist_list.filter(
      (name) => typeof name === "string" && name.trim().length > 0,
    );
    if (artistNames.length === 0) continue;

    console.log(`🎵 TJ ${candidate.tj_song_id} - "${candidate.title}"`);
    const songArtistSet =
      artistSongCache.get(candidate.song_id) ?? new Set<number>();
    let createdArtistsForSong = 0;
    let createdMappingsForSong = 0;

    for (const rawName of artistNames) {
      const artistName = rawName.trim();
      if (artistName.length === 0) continue;

      let artist = artistCache.get(artistName);
      if (!artist) {
        if (isForce) {
          artist = await prisma.artist.create({
            data: {
              name: artistName,
              nameKo: artistName,
            },
          });
          artistCache.set(artistName, artist);
          totalCreatedArtists++;
          createdArtistsForSong++;
          console.log(`  ✨ Artist 생성: ${artistName} (ID: ${artist.id})`);
        } else {
          console.log(`  [DRY RUN] Would create Artist: ${artistName}`);
          continue;
        }
      }

      if (songArtistSet.has(artist.id)) {
        continue;
      }

      if (isForce) {
        await prisma.artistSong.create({
          data: {
            artistId: artist.id,
            songId: candidate.song_id,
          },
        });
        songArtistSet.add(artist.id);
        totalCreatedMappings++;
        createdMappingsForSong++;
        console.log(
          `  🔗 ArtistSong 매핑 생성: song ${candidate.song_id} ← artist ${artist.id} (${artist.name})`,
        );
      } else {
        console.log(
          `  [DRY RUN] Would link song ${candidate.song_id} ← artist ${artist.id} (${artist.name})`,
        );
      }
    }

    if (!artistSongCache.has(candidate.song_id)) {
      artistSongCache.set(candidate.song_id, songArtistSet);
    }

    console.log(
      `  ↳ 처리 결과 - 신규 Artist: ${createdArtistsForSong}, 신규 매핑: ${createdMappingsForSong}\n`,
    );
  }

  console.log(
    `\n📊 총 처리 곡: ${candidates.length}, 신규 Artist: ${totalCreatedArtists}, 신규 ArtistSong: ${totalCreatedMappings}`,
  );

  if (isForce) {
    console.log("\n✅ 핫픽스 완료!");
    console.log(
      `생성된 Artist: ${totalCreatedArtists}, 생성된 ArtistSong: ${totalCreatedMappings}`,
    );
  } else {
    console.log(
      "\nℹ️  --force 없이 실행했습니다. 실제 수정을 적용하려면 --force 옵션을 추가하세요.",
    );
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error("❌ 오류 발생:", error);
  process.exitCode = 1;
});
