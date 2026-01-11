/**
 * 전체 아티스트 Song-SpotifyTrack 매핑 고속 적용
 *
 * - JSON 파일 생성 없이 메모리에서 매핑 생성 후 바로 DB 적용
 * - force 모드 기본 (매칭 여부 상관없이 무조건 적용)
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/core/fast-apply-all-artists.ts
 * pnpm ts-node src/scripts/spotify/core/fast-apply-all-artists.ts --dry-run
 * pnpm ts-node src/scripts/spotify/core/fast-apply-all-artists.ts --start 1 --end 50
 * pnpm ts-node src/scripts/spotify/core/fast-apply-all-artists.ts --start 1 --end 50 --dry-run
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { findBestMatch } from "../../../lib/song-spotify-matcher.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface ArtistSongsData {
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
    musicBrainzTitle?: string;
  }>;
}

interface Mapping {
  spotifyTrackId: number;
  spotifyTrackName: string;
  songId: number;
  songName: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  let start = 1;
  let end = 272;

  const startIdx = args.indexOf("--start");
  if (startIdx !== -1 && args[startIdx + 1]) {
    start = Number.parseInt(args[startIdx + 1], 10);
  }

  const endIdx = args.indexOf("--end");
  if (endIdx !== -1 && args[endIdx + 1]) {
    end = Number.parseInt(args[endIdx + 1], 10);
  }

  return { start, end, isDryRun };
}

async function fetchArtistData(artistId: number): Promise<ArtistSongsData> {
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
        select: {
          id: true,
          name: true,
          musicBrainzTitle: true,
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
      musicBrainzTitle: t.musicBrainzTitle || undefined,
    })),
  };
}

function generateMappings(data: ArtistSongsData): Mapping[] {
  const mappings: Mapping[] = [];

  for (const track of data.spotifyTracks) {
    let finalAnswer: string | null = null;
    let answerField: "title" | "titleKo" | null = null;

    // 우선순위 1: musicBrainzTitle ↔ song.title
    if (!finalAnswer && track.musicBrainzTitle) {
      const candidateTitles = data.songs.map((s) => s.title);
      const result = findBestMatch(track.musicBrainzTitle, candidateTitles);
      if (result.answer) {
        finalAnswer = result.answer;
        answerField = "title";
      }
    }

    // 우선순위 2: title ↔ song.title
    if (!finalAnswer) {
      const candidateTitles = data.songs.map((s) => s.title);
      const result = findBestMatch(track.title, candidateTitles);
      if (result.answer) {
        finalAnswer = result.answer;
        answerField = "title";
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
          answerField = "titleKo";
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
          answerField = "titleKo";
        }
      }
    }

    // answer 있으면 매핑 추가
    if (finalAnswer && answerField) {
      const matchedSong = data.songs.find((s) =>
        answerField === "title"
          ? s.title === finalAnswer
          : s.titleKo === finalAnswer,
      );

      if (matchedSong) {
        mappings.push({
          spotifyTrackId: track.id,
          spotifyTrackName: track.musicBrainzTitle || track.title,
          songId: matchedSong.id,
          songName: finalAnswer,
        });
      }
    }
  }

  return mappings;
}

async function applyMappings(mappings: Mapping[], isDryRun: boolean) {
  let applied = 0;
  let errors = 0;
  let skipped = 0;

  // 이미 처리된 songId 추적 (같은 Song에 여러 Track 매칭 시 첫 번째만 적용)
  const processedSongIds = new Set<number>();

  for (const mapping of mappings) {
    try {
      if (isDryRun) {
        console.log(
          `  [DRY RUN] Song ${mapping.songId} (${mapping.songName}) ↔ Track ${mapping.spotifyTrackId} (${mapping.spotifyTrackName})`,
        );
        applied++;
      } else {
        // 0. 이미 처리된 Song이면 스킵
        if (processedSongIds.has(mapping.songId)) {
          console.log(
            `  ⏭️  SKIP: Song ${mapping.songId} (${mapping.songName}) 이미 처리됨 - Track ${mapping.spotifyTrackId} (${mapping.spotifyTrackName})`,
          );
          skipped++;
          continue;
        }

        // 1. SpotifyTrack의 기존 Group 찾기
        const spotifyTrack = await prisma.spotifyTrack.findUnique({
          where: { id: mapping.spotifyTrackId },
          select: { groupId: true },
        });

        if (!spotifyTrack) {
          throw new Error(`SpotifyTrack ${mapping.spotifyTrackId} not found`);
        }

        if (!spotifyTrack.groupId) {
          throw new Error(`SpotifyTrack ${mapping.spotifyTrackId} has no group`);
        }

        // 2. Group이 이미 다른 Song에 연결되어 있는지 확인
        const existingGroup = await prisma.spotifyTrackGroup.findUnique({
          where: { id: spotifyTrack.groupId },
          select: { songId: true },
        });

        if (existingGroup?.songId && existingGroup.songId !== mapping.songId) {
          // 이미 다른 Song에 연결되어 있으면 스킵
          console.log(
            `  ⚠️  SKIP: Group ${spotifyTrack.groupId}는 이미 Song ${existingGroup.songId}에 연결됨 - Track ${mapping.spotifyTrackId} (${mapping.spotifyTrackName}) → Song ${mapping.songId} (${mapping.songName}) 시도했으나 실패`,
          );
          skipped++;
          continue;
        }

        if (existingGroup?.songId === mapping.songId) {
          // 이미 같은 Song에 연결되어 있으면 조용히 스킵
          skipped++;
          processedSongIds.add(mapping.songId);
          continue;
        }

        // 3. Group의 songId 업데이트
        await prisma.spotifyTrackGroup.update({
          where: { id: spotifyTrack.groupId },
          data: { songId: mapping.songId },
        });

        console.log(
          `  ✅ APPLIED: Song ${mapping.songId} (${mapping.songName}) ↔ Group ${spotifyTrack.groupId} ← Track ${mapping.spotifyTrackId} (${mapping.spotifyTrackName})`,
        );

        processedSongIds.add(mapping.songId);
        applied++;
      }
    } catch (error: any) {
      console.error(
        `  ❌ Error: Song ${mapping.songId} ↔ Track ${mapping.spotifyTrackId}: ${error.message}`,
      );
      errors++;
    }
  }

  return { applied, errors, skipped };
}

async function main() {
  const { start, end, isDryRun } = parseArgs();

  console.log("🚀 Fast Song-SpotifyTrack Mapping");
  console.log(`📊 Artist range: ${start} ~ ${end}`);
  if (isDryRun) {
    console.log("🔍 DRY RUN MODE");
  }
  console.log("⚡ FORCE MODE (always apply)");
  console.log("\n" + "=".repeat(70) + "\n");

  let totalProcessed = 0;
  let totalApplied = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  const startTime = Date.now();

  for (let artistId = start; artistId <= end; artistId++) {
    try {
      const data = await fetchArtistData(artistId);

      if (data.songs.length === 0 || data.spotifyTracks.length === 0) {
        console.log(
          `⏭️  Artist ${artistId}: ${data.artist.name} - No data (songs: ${data.songs.length}, tracks: ${data.spotifyTracks.length})`,
        );
        totalSkipped++;
        continue;
      }

      const mappings = generateMappings(data);

      console.log(
        `🎤 Artist ${artistId}: ${data.artist.name} (${data.artist.nameKo})`,
      );
      console.log(
        `   Songs: ${data.songs.length}, Tracks: ${data.spotifyTracks.length}, Mappings: ${mappings.length}`,
      );

      if (mappings.length > 0) {
        const { applied, errors } = await applyMappings(mappings, isDryRun);
        console.log(`   ✅ Applied: ${applied}, ❌ Errors: ${errors}`);
        totalApplied += applied;
        totalErrors += errors;
      } else {
        console.log("   ⚠️  No mappings generated");
      }

      totalProcessed++;
    } catch (error: any) {
      console.error(`❌ Artist ${artistId}: ${error.message}`);
      totalErrors++;
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log("\n" + "=".repeat(70));
  console.log("🎉 SUMMARY");
  console.log("=".repeat(70));
  console.log(`✅ Artists processed: ${totalProcessed}`);
  console.log(`✅ Mappings applied: ${totalApplied}`);
  console.log(`⏭️  Artists skipped: ${totalSkipped}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log(`⏱️  Duration: ${duration}s`);
  console.log("=".repeat(70));

  if (isDryRun) {
    console.log("\n✨ Dry run complete! Run without --dry-run to apply.");
  } else {
    console.log("\n✨ Done!");
  }
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
