/**
 * 전체 아티스트 Song-SpotifyTrack 매핑 고속 적용
 *
 * - JSON 파일 생성 없이 메모리에서 매핑 생성 후 바로 DB 적용
 * - 기본: 이미 연결된 Song은 스킵
 * - --force: 이미 연결된 Song도 덮어쓰기
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/core/fast-apply-all-artists.ts
 * pnpm ts-node src/scripts/spotify/core/fast-apply-all-artists.ts --dry-run
 * pnpm ts-node src/scripts/spotify/core/fast-apply-all-artists.ts --force
 * pnpm ts-node src/scripts/spotify/core/fast-apply-all-artists.ts --start 1 --end 50
 * pnpm ts-node src/scripts/spotify/core/fast-apply-all-artists.ts --start 1 --end 50 --force --dry-run
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
  const isForce = args.includes("--force");

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

  return { start, end, isDryRun, isForce };
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

  for (const song of data.songs) {
    let finalAnswer: string | null = null;
    let answerField: "title" | "musicBrainzTitle" | null = null;

    // 우선순위 1: song.title ↔ track.musicBrainzTitle
    if (!finalAnswer) {
      const candidateMbTitles = data.spotifyTracks
        .filter((t) => t.musicBrainzTitle)
        .map((t) => t.musicBrainzTitle as string);

      if (candidateMbTitles.length > 0) {
        const result = findBestMatch(song.title, candidateMbTitles);
        if (result.answer) {
          finalAnswer = result.answer;
          answerField = "musicBrainzTitle";
        }
      }
    }

    // 우선순위 2: song.title ↔ track.title
    if (!finalAnswer) {
      const candidateTitles = data.spotifyTracks.map((t) => t.title);
      const result = findBestMatch(song.title, candidateTitles);
      if (result.answer) {
        finalAnswer = result.answer;
        answerField = "title";
      }
    }

    // 우선순위 3: song.titleKo ↔ track.musicBrainzTitle
    if (!finalAnswer && song.titleKo) {
      const candidateMbTitles = data.spotifyTracks
        .filter((t) => t.musicBrainzTitle)
        .map((t) => t.musicBrainzTitle as string);

      if (candidateMbTitles.length > 0) {
        const result = findBestMatch(song.titleKo, candidateMbTitles);
        if (result.answer) {
          finalAnswer = result.answer;
          answerField = "musicBrainzTitle";
        }
      }
    }

    // 우선순위 4: song.titleKo ↔ track.title
    if (!finalAnswer && song.titleKo) {
      const candidateTitles = data.spotifyTracks.map((t) => t.title);
      const result = findBestMatch(song.titleKo, candidateTitles);
      if (result.answer) {
        finalAnswer = result.answer;
        answerField = "title";
      }
    }

    // answer 있으면 매핑 추가
    if (finalAnswer && answerField) {
      const matchedTrack = data.spotifyTracks.find((t) =>
        answerField === "musicBrainzTitle"
          ? t.musicBrainzTitle === finalAnswer
          : t.title === finalAnswer,
      );

      if (matchedTrack) {
        mappings.push({
          spotifyTrackId: matchedTrack.id,
          spotifyTrackName: matchedTrack.musicBrainzTitle || matchedTrack.title,
          songId: song.id,
          songName: song.titleKo || song.title,
        });
      }
    }
  }

  return mappings;
}

async function applyMappings(mappings: Mapping[], isDryRun: boolean, isForce: boolean) {
  let applied = 0;
  let errors = 0;
  let skipped = 0;

  for (const mapping of mappings) {
    try {
      if (isDryRun) {
        console.log(
          `  [DRY RUN] Song ${mapping.songId} (${mapping.songName}) ↔ Track ${mapping.spotifyTrackId} (${mapping.spotifyTrackName})`,
        );
        applied++;
      } else {
        // 0. force가 아니면 이미 연결된 Song은 스킵
        if (!isForce) {
          const existingSong = await prisma.song.findUnique({
            where: { id: mapping.songId },
            select: { spotifyTrackGroupId: true },
          });

          if (existingSong?.spotifyTrackGroupId) {
            skipped++;
            continue;
          }
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
          throw new Error(
            `SpotifyTrack ${mapping.spotifyTrackId} has no group`,
          );
        }

        // 2. Song의 spotifyTrackGroupId 업데이트
        await prisma.song.update({
          where: { id: mapping.songId },
          data: { spotifyTrackGroupId: spotifyTrack.groupId },
        });

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
  const { start, end, isDryRun, isForce } = parseArgs();

  console.log("🚀 Fast Song-SpotifyTrack Mapping");
  console.log(`📊 Artist range: ${start} ~ ${end}`);
  if (isDryRun) {
    console.log("🔍 DRY RUN MODE");
  }
  if (isForce) {
    console.log("⚡ FORCE MODE (덮어쓰기)");
  } else {
    console.log("✅ SAFE MODE (이미 연결된 Song 스킵)");
  }
  console.log("\n" + "=".repeat(70) + "\n");

  let totalProcessed = 0;
  let totalApplied = 0;
  let totalErrors = 0;
  let totalArtistSkipped = 0;
  let totalSongSkipped = 0;

  const startTime = Date.now();

  for (let artistId = start; artistId <= end; artistId++) {
    try {
      const data = await fetchArtistData(artistId);

      if (data.songs.length === 0 || data.spotifyTracks.length === 0) {
        console.log(
          `⏭️  Artist ${artistId}: ${data.artist.name} - No data (songs: ${data.songs.length}, tracks: ${data.spotifyTracks.length})`,
        );
        totalArtistSkipped++;
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
        const { applied, errors, skipped } = await applyMappings(mappings, isDryRun, isForce);
        console.log(`   ✅ Applied: ${applied}, ❌ Errors: ${errors}, ⏭️ Skipped: ${skipped}`);
        totalApplied += applied;
        totalErrors += errors;
        totalSongSkipped += skipped;
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
  console.log(`⏭️  Artists skipped (no data): ${totalArtistSkipped}`);
  console.log(`⏭️  Songs skipped (already connected): ${totalSongSkipped}`);
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
