/**
 * SongPropose와 Song 매칭 스크립트
 *
 * 목적:
 * - SongPropose 테이블에 해당 곡이 Song에 이미 존재하는지 확인하고 songId를 매핑
 * - artistId가 300 이하인 아티스트를 대상으로 처리
 *
 * 매칭 로직:
 * 1. 아티스트의 tjName/tjNameJa를 기반으로 SongPropose.songSinger와 매칭
 * 2. 해당 아티스트의 Song들과 SongPropose.songTitle을 findBestMatch로 비교
 * 3. Song의 title, titleKo, primarySpotifyTrack.name을 비교 대상으로 사용
 *
 * 사용법:
 * pnpm ts-node src/scripts/propose/map-propose-song.ts
 * pnpm ts-node src/scripts/propose/map-propose-song.ts --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { findBestMatch } from "../../lib/song-spotify-matcher.ts";
import { normalizeTitle } from "../../lib/track-title-normalizer.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface SongWithTitles {
  id: number;
  title: string;
  titleKo: string | null;
  primarySpotifyTrackName: string | null;
}

interface ProposeInfo {
  id: number;
  songTitle: string;
  songSinger: string;
}

interface MappingResult {
  propose: ProposeInfo;
  matchedSong: {
    id: number;
    title: string;
    matchedBy: string;
  } | null;
  candidates: Array<{
    id: number;
    title: string;
  }>;
}

async function fetchArtistsWithTjName() {
  const artists = await prisma.artist.findMany({
    where: {
      id: { lte: 300 },
      OR: [{ tjName: { not: null } }, { tjNameJa: { not: null } }],
    },
    select: {
      id: true,
      name: true,
      nameKo: true,
      tjName: true,
      tjNameJa: true,
    },
  });

  return artists;
}

async function fetchSongsForArtist(artistId: number): Promise<SongWithTitles[]> {
  const songs = await prisma.song.findMany({
    where: {
      artistSongs: {
        some: { artistId },
      },
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
      spotifyTrackGroup: {
        select: {
          primaryTrack: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return songs.map((song) => ({
    id: song.id,
    title: song.title,
    titleKo: song.titleKo,
    primarySpotifyTrackName: song.spotifyTrackGroup?.primaryTrack?.name ?? null,
  }));
}

async function fetchProposesForSinger(singerNames: string[]): Promise<ProposeInfo[]> {
  if (singerNames.length === 0) return [];

  const proposes = await prisma.songPropose.findMany({
    where: {
      songId: null, // 아직 매핑되지 않은 것만
      songSinger: { in: singerNames },
    },
    select: {
      id: true,
      songTitle: true,
      songSinger: true,
    },
  });

  return proposes;
}

function generateMapping(
  songs: SongWithTitles[],
  proposes: ProposeInfo[],
): MappingResult[] {
  const results: MappingResult[] = [];

  if (songs.length === 0 || proposes.length === 0) {
    return results;
  }

  // Song들의 타이틀들을 normalize해서 역매핑 인덱스 만들기
  // normalizedTitle -> SongWithTitles (첫 번째 매칭만 사용)
  const normalizedToSong = new Map<string, { song: SongWithTitles; source: string }>();

  for (const song of songs) {
    // title
    const normTitle = normalizeTitle(song.title);
    if (normTitle && !normalizedToSong.has(normTitle)) {
      normalizedToSong.set(normTitle, { song, source: "title" });
    }

    // titleKo
    if (song.titleKo) {
      const normTitleKo = normalizeTitle(song.titleKo);
      if (normTitleKo && !normalizedToSong.has(normTitleKo)) {
        normalizedToSong.set(normTitleKo, { song, source: "titleKo" });
      }
    }

    // primarySpotifyTrackName
    if (song.primarySpotifyTrackName) {
      const normSpotify = normalizeTitle(song.primarySpotifyTrackName);
      if (normSpotify && !normalizedToSong.has(normSpotify)) {
        normalizedToSong.set(normSpotify, { song, source: "primarySpotifyTrackName" });
      }
    }
  }

  const normalizedSongTitles = Array.from(normalizedToSong.keys());

  for (const propose of proposes) {
    const normalizedQuery = normalizeTitle(propose.songTitle);

    if (!normalizedQuery) {
      results.push({
        propose,
        matchedSong: null,
        candidates: [],
      });
      continue;
    }

    const result = findBestMatch(normalizedQuery, normalizedSongTitles);

    let matchedSong: MappingResult["matchedSong"] = null;
    const candidates: MappingResult["candidates"] = [];

    // answer가 있으면 매칭된 Song 찾기
    if (result.answer) {
      const matched = normalizedToSong.get(result.answer);
      if (matched) {
        matchedSong = {
          id: matched.song.id,
          title: matched.song.title,
          matchedBy: `${matched.source}: "${propose.songTitle}" -> "${result.answer}"`,
        };
      }
    }

    // candidate들 처리
    for (const candidateNorm of result.candidate) {
      const matched = normalizedToSong.get(candidateNorm);
      if (matched && (!matchedSong || matched.song.id !== matchedSong.id)) {
        candidates.push({
          id: matched.song.id,
          title: matched.song.title,
        });
      }
    }

    results.push({
      propose,
      matchedSong,
      candidates,
    });
  }

  return results;
}

async function applyMapping(mappings: MappingResult[], dryRun: boolean) {
  const toUpdate: Array<{ proposeId: number; songId: number }> = [];

  for (const mapping of mappings) {
    if (mapping.matchedSong) {
      toUpdate.push({
        proposeId: mapping.propose.id,
        songId: mapping.matchedSong.id,
      });
    }
  }

  if (dryRun) {
    console.log(`\n🔍 [DRY-RUN] Would update ${toUpdate.length} proposes`);
    return { updated: 0, failed: 0 };
  }

  let updated = 0;
  let failed = 0;

  for (const item of toUpdate) {
    try {
      await prisma.songPropose.update({
        where: { id: item.proposeId },
        data: { songId: item.songId },
      });
      updated++;
    } catch (error) {
      console.error(`❌ Failed to update propose ${item.proposeId}:`, error);
      failed++;
    }
  }

  return { updated, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  console.log("\n🚀 SongPropose - Song 매칭 스크립트 시작");
  if (dryRun) console.log("🔍 DRY-RUN MODE\n");

  let totalUpdated = 0;
  let totalFailed = 0;
  let totalMatched = 0;
  let totalWithCandidates = 0;
  let totalNoMatch = 0;

  try {
    // 1. tjName이 있는 아티스트들 조회
    const artists = await fetchArtistsWithTjName();
    console.log(`📋 처리할 아티스트 수: ${artists.length}\n`);

    for (const artist of artists) {
      // 가수 이름 리스트 구성 (tjName, tjNameJa)
      const singerNames: string[] = [];
      if (artist.tjName) singerNames.push(artist.tjName);
      if (artist.tjNameJa) singerNames.push(artist.tjNameJa);

      if (singerNames.length === 0) continue;

      // 2. 해당 아티스트의 Song들 조회
      const songs = await fetchSongsForArtist(artist.id);

      // 3. 해당 가수명으로 된 SongPropose 조회 (songId가 null인 것만)
      const proposes = await fetchProposesForSinger(singerNames);

      if (proposes.length === 0) continue;

      console.log(
        `\n==================== [Artist ID ${artist.id}] ${artist.name} ====================`,
      );
      console.log(`🎤 TJ Names: ${singerNames.join(", ")}`);
      console.log(`🎵 Songs: ${songs.length}`);
      console.log(`📝 Unmapped Proposes: ${proposes.length}\n`);

      // 4. 매칭 생성
      const mappings = generateMapping(songs, proposes);

      const withMatches = mappings.filter((m) => m.matchedSong !== null);
      const withCandidates = mappings.filter(
        (m) => m.matchedSong === null && m.candidates.length > 0,
      );
      const noMatches = mappings.filter(
        (m) => m.matchedSong === null && m.candidates.length === 0,
      );

      // 매칭 결과 출력
      if (withMatches.length > 0) {
        console.log("✅ Matched:");
        for (const m of withMatches) {
          console.log(
            `   [Propose ${m.propose.id}] "${m.propose.songTitle}" -> [Song ${m.matchedSong!.id}] "${m.matchedSong!.title}"`,
          );
        }
      }

      if (withCandidates.length > 0) {
        console.log("\n🤔 Candidates only:");
        for (const m of withCandidates) {
          console.log(`   [Propose ${m.propose.id}] "${m.propose.songTitle}"`);
          for (const c of m.candidates.slice(0, 3)) {
            console.log(`      - [Song ${c.id}] "${c.title}"`);
          }
        }
      }

      console.log("\n" + "=".repeat(70));
      console.log("📊 Statistics:");
      console.log(`  ✅ Matched: ${withMatches.length}`);
      console.log(`  🤔 Candidates only: ${withCandidates.length}`);
      console.log(`  ❌ No matches: ${noMatches.length}`);
      console.log("=".repeat(70));

      // 5. 매핑 적용
      const { updated, failed } = await applyMapping(mappings, dryRun);

      totalUpdated += updated;
      totalFailed += failed;
      totalMatched += withMatches.length;
      totalWithCandidates += withCandidates.length;
      totalNoMatch += noMatches.length;

      if (!dryRun && withMatches.length > 0) {
        console.log(`\n✅ Updated: ${updated}`);
        if (failed > 0) console.log(`❌ Failed: ${failed}`);
      }
    }

    console.log("\n==================== [SUMMARY] ====================");
    console.log(`✅ Total matched: ${totalMatched}`);
    console.log(`🤔 Total with candidates only: ${totalWithCandidates}`);
    console.log(`❌ Total no matches: ${totalNoMatch}`);
    if (!dryRun) {
      console.log(`\n📝 Total updated: ${totalUpdated}`);
      if (totalFailed > 0) console.log(`❌ Total failed: ${totalFailed}`);
    }
    console.log("=".repeat(50));
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
