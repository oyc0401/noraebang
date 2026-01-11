/**
 * Artist의 Song(TJ)과 SpotifyTrack 매칭 JSON 생성
 *
 * 매칭 로직:
 * - findBestMatch 알고리즘 사용 (정확도 우선 매칭)
 * - spotifyTrack.musicBrainzTitle → song.title 매칭 (일본어 우선)
 * - 없으면 spotifyTrack.title → song.title 매칭
 *
 * 출력:
 * {
 *   "spotifyTrack": {id:232, name:"sss"}
 *   "songs": [{id:456, name:"dsa"}, {id:789, name:"dsas"}],          // answer (자동 확정 매칭)
 *   "candidateSong": [{id:111, name:"ssss"}, {id:222, name:"hhhh"}],  // candidate (근접 후보)
 * }
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts <artistId>
 * pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts 3
 */

import "dotenv/config";
import fs from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { findBestMatch } from "../../../lib/song-spotify-matcher.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface ArtistSongsJson {
  artist: {
    id: number;
    name: string;
    nameKo: string;
    spotifyId: string | null;
  };
  songs: Array<{
    id: number;
    title: string;
    titleKo: string | null;
  }>;
  spotifyTracks: Array<{
    id: number;
    title: string;
    spotifyId: string;
    isrc: string | null;
    durationMs: number;
    musicBrainzTitle?: string;
  }>;
}

interface MappingResult {
  spotifyTrack: {
    id: number;
    name: string; // 매칭에 사용된 이름 (musicBrainzTitle 또는 title)
  };
  songs: Array<{
    id: number;
    name: string; // 매칭된 필드 값 (title 또는 titleKo)
  }>;
  candidateSong: Array<{
    id: number;
    name: string; // 후보로 올라온 필드 값
  }>;
}

/**
 * Spotify 트랙마다 유사한 Song들 찾기
 * 우선순위:
 * 1. spotifyTrack.musicBrainzTitle ↔ song.title
 * 2. spotifyTrack.title ↔ song.title
 * 3. spotifyTrack.musicBrainzTitle ↔ song.titleKo
 * 4. spotifyTrack.title ↔ song.titleKo
 */
function generateMapping(data: ArtistSongsJson): MappingResult[] {
  const results: MappingResult[] = [];

  for (const track of data.spotifyTracks) {
    let finalAnswer: string | null = null;
    let finalCandidates: string[] = [];
    let answerField: "title" | "titleKo" | null = null;
    let spotifyTrackField: "musicBrainzTitle" | "title" | null = null;

    // 우선순위 1: musicBrainzTitle ↔ song.title
    if (track.musicBrainzTitle) {
      const candidateTitles = data.songs.map((s) => s.title);
      const result = findBestMatch(track.musicBrainzTitle, candidateTitles);

      if (result.answer) {
        finalAnswer = result.answer;
        finalCandidates = result.candidate;
        answerField = "title";
        spotifyTrackField = "musicBrainzTitle";
      } else {
        // answer 없으면 candidate만 수집
        finalCandidates.push(...result.candidate);
      }
    }

    // 우선순위 2: title ↔ song.title
    if (!finalAnswer) {
      const candidateTitles = data.songs.map((s) => s.title);
      const result = findBestMatch(track.title, candidateTitles);

      if (result.answer) {
        finalAnswer = result.answer;
        finalCandidates = result.candidate;
        answerField = "title";
        spotifyTrackField = "title";
      } else {
        finalCandidates.push(...result.candidate);
      }
    }

    // 우선순위 3: musicBrainzTitle ↔ song.titleKo
    if (!finalAnswer && track.musicBrainzTitle) {
      const candidateTitleKos = data.songs
        .filter((s) => s.titleKo)
        .map((s) => s.titleKo as string);

      if (candidateTitleKos.length > 0) {
        const result = findBestMatch(track.musicBrainzTitle, candidateTitleKos);

        if (result.answer) {
          finalAnswer = result.answer;
          finalCandidates = result.candidate;
          answerField = "titleKo";
          spotifyTrackField = "musicBrainzTitle";
        } else {
          finalCandidates.push(...result.candidate);
        }
      }
    }

    // 우선순위 4: title ↔ song.titleKo
    if (!finalAnswer) {
      const candidateTitleKos = data.songs
        .filter((s) => s.titleKo)
        .map((s) => s.titleKo as string);

      if (candidateTitleKos.length > 0) {
        const result = findBestMatch(track.title, candidateTitleKos);

        if (result.answer) {
          finalAnswer = result.answer;
          finalCandidates = result.candidate;
          answerField = "titleKo";
          spotifyTrackField = "title";
        } else {
          finalCandidates.push(...result.candidate);
        }
      }
    }

    // answer → songs
    const songs: Array<{ id: number; name: string }> = [];
    if (finalAnswer && answerField) {
      const matchedSong = data.songs.find((s) =>
        answerField === "title"
          ? s.title === finalAnswer
          : s.titleKo === finalAnswer,
      );
      if (matchedSong) {
        songs.push({
          id: matchedSong.id,
          name: finalAnswer,
        });
      }
    }

    // candidate → candidateSong (중복 제거)
    const candidateSongMap = new Map<number, string>();
    for (const candidateTitle of finalCandidates) {
      // title이나 titleKo 둘 중 하나라도 매칭되면 추가
      const candidateSong = data.songs.find(
        (s) => s.title === candidateTitle || s.titleKo === candidateTitle,
      );
      if (candidateSong && !songs.find((s) => s.id === candidateSong.id)) {
        candidateSongMap.set(candidateSong.id, candidateTitle);
      }
    }

    const candidateSong = Array.from(candidateSongMap.entries()).map(
      ([id, name]) => ({ id, name }),
    );

    // spotifyTrack name 결정
    const spotifyTrackName =
      spotifyTrackField === "musicBrainzTitle"
        ? track.musicBrainzTitle || track.title
        : track.title;

    results.push({
      spotifyTrack: {
        id: track.id,
        name: spotifyTrackName,
      },
      songs,
      candidateSong,
    });
  }

  return results;
}

async function fetchArtistData(artistId: number): Promise<ArtistSongsJson> {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
    },
  });

  if (!artist) {
    throw new Error(`Artist with ID ${artistId} not found`);
  }

  // Artist의 spotifyId로 SpotifyArtist 찾기
  const spotifyArtist = artist.spotifyId
    ? await prisma.spotifyArtist.findUnique({
        where: { spotifyId: artist.spotifyId },
        select: { id: true },
      })
    : null;

  const songs = await prisma.song.findMany({
    where: {
      artistSongs: {
        some: {
          artistId,
        },
      },
    },
    select: {
      id: true,
      title: true,
      titleKo: true,
    },
  });

  const spotifyTracks = spotifyArtist
    ? await prisma.spotifyTrack.findMany({
        where: {
          disabled: false,
          artists: {
            some: {
              spotifyArtistId: spotifyArtist.id,
            },
          },
        },
      })
    : [];

  return {
    artist: {
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo || "",
      spotifyId: artist.spotifyId,
    },
    songs: songs.map((s) => ({
      id: s.id,
      title: s.title,
      titleKo: s.titleKo,
    })),
    spotifyTracks: spotifyTracks.map((t) => ({
      id: t.id,
      title: t.name,
      spotifyId: t.spotifyId,
      isrc: t.isrc,
      durationMs: t.durationMs || 0,
      musicBrainzTitle: (t as any).musicBrainzTitle || undefined,
    })),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const artistIdStr = args[0];

  if (!artistIdStr) {
    console.error(
      "❌ Usage: pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts <artistId>",
    );
    console.error(
      "   Example: pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts 3",
    );
    process.exit(1);
  }

  const artistId = Number.parseInt(artistIdStr, 10);
  if (Number.isNaN(artistId)) {
    console.error(`❌ Invalid artistId: ${artistIdStr}`);
    process.exit(1);
  }

  console.log(`\n📂 Fetching data for Artist ID ${artistId}...\n`);

  let data: ArtistSongsJson;
  try {
    data = await fetchArtistData(artistId);
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`🎵 Artist: ${data.artist.name} (${data.artist.nameKo})`);
  console.log(`📊 Songs: ${data.songs.length}`);
  console.log(`📀 Spotify Tracks: ${data.spotifyTracks.length}\n`);

  // 매칭 생성
  console.log("🔍 Generating mappings...\n");
  const mappings = generateMapping(data);

  // 통계
  const withAnswer = mappings.filter((m) => m.songs.length > 0);
  const withoutAnswer = mappings.filter((m) => m.songs.length === 0);
  const withCandidates = mappings.filter((m) => m.candidateSong.length > 0);

  console.log("=".repeat(70));
  console.log("📊 Statistics:");
  console.log(`  ✅ Spotify tracks with answer: ${withAnswer.length}`);
  console.log(
    `  🤔 Spotify tracks with candidates only: ${withCandidates.filter((m) => m.songs.length === 0).length}`,
  );
  console.log(`  ❌ Spotify tracks without matches: ${withoutAnswer.length}`);
  console.log(`${"=".repeat(70)}\n`);

  // 샘플 출력 (answer 있는 것들)
  console.log("✅ Sample mappings with answer (first 10):");
  withAnswer.slice(0, 10).forEach((m, i) => {
    console.log(
      `\n${i + 1}. Spotify: "${m.spotifyTrack.name}" (ID: ${m.spotifyTrack.id})`,
    );

    console.log(`   Answer Songs (${m.songs.length}):`);
    m.songs.forEach((song, j) => {
      console.log(`     ${j + 1}. "${song.name}" (ID: ${song.id})`);
    });

    if (m.candidateSong.length > 0) {
      console.log(`   Candidates (${m.candidateSong.length}):`);
      m.candidateSong.slice(0, 3).forEach((song, j) => {
        console.log(`     ${j + 1}. "${song.name}" (ID: ${song.id})`);
      });
      if (m.candidateSong.length > 3) {
        console.log(`     ... and ${m.candidateSong.length - 3} more`);
      }
    }
  });

  // 후보만 있는 것 샘플
  const candidatesOnly = withCandidates.filter((m) => m.songs.length === 0);
  if (candidatesOnly.length > 0) {
    console.log("\n\n🤔 Sample with candidates only (first 5):");
    candidatesOnly.slice(0, 5).forEach((m, i) => {
      console.log(
        `${i + 1}. Spotify: "${m.spotifyTrack.name}" (ID: ${m.spotifyTrack.id})`,
      );
      console.log(
        `   Candidates: ${m.candidateSong.map((s) => `"${s.name}" (${s.id})`).join(", ")}`,
      );
    });
  }

  // 매칭 안된 것 샘플
  if (withoutAnswer.length > 0) {
    console.log("\n\n❌ Sample without any matches (first 5):");
    withoutAnswer.slice(0, 5).forEach((m, i) => {
      console.log(
        `${i + 1}. Spotify: "${m.spotifyTrack.name}" (ID: ${m.spotifyTrack.id})`,
      );
    });
  }

  // JSON 저장
  const outputPath = `artist-mapping.json`;
  fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2));
  console.log(`\n💾 Saved mapping to ${outputPath}`);

  // 간단한 통계 파일도 저장
  const statsPath = `artist-mapping-stats.json`;
  fs.writeFileSync(
    statsPath,
    JSON.stringify(
      {
        artist: data.artist,
        totalSongs: data.songs.length,
        totalSpotifyTracks: data.spotifyTracks.length,
        stats: {
          tracksWithAnswer: withAnswer.length,
          tracksWithCandidatesOnly: candidatesOnly.length,
          tracksWithoutMatches: withoutAnswer.length,
          totalAnswerMappings: withAnswer.reduce(
            (sum, m) => sum + m.songs.length,
            0,
          ),
          totalCandidateMappings: mappings.reduce(
            (sum, m) => sum + m.candidateSong.length,
            0,
          ),
        },
      },
      null,
      2,
    ),
  );
  console.log(`📊 Saved stats to ${statsPath}\n`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  prisma.$disconnect();
  process.exit(1);
});
