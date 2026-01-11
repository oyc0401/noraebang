/**
 * MusicBrainz API를 사용하여 Spotify 트랙의 일본어 원어 제목을 가져와서 저장하는 스크립트
 *
 * 기능:
 * - artistId로 아티스트의 모든 SpotifyTrack 조회 (disabled=true도 찾기.)
 * - 각 트랙의 ISRC로 MusicBrainz API 호출
 * - 일본어 제목을 찾아서 musicBrainzTitle 필드에 저장
 * - Rate limiting: 1초당 1요청 (MusicBrainz 정책 준수)
 * - artistId 없으면 모든 아티스트 처리
 * - artistId 있으면 해당 ID부터 처리
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/fetch-musicbrainz-titles.ts
 * pnpm ts-node src/scripts/spotify/fetch-musicbrainz-titles.ts --dry-run
 * pnpm ts-node src/scripts/spotify/fetch-musicbrainz-titles.ts 123
 * pnpm ts-node src/scripts/spotify/fetch-musicbrainz-titles.ts 123 --dry-run
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

// MusicBrainz API User-Agent (필수)
const USER_AGENT = "SongApp/1.0 (https://github.com/yourapp)";

interface MusicBrainzArtist {
  id: string;
  name: string;
  "sort-name": string;
  disambiguation?: string;
}

interface MusicBrainzRecording {
  id: string;
  title: string;
  disambiguation?: string;
  "artist-credit"?: Array<{
    artist: MusicBrainzArtist;
  }>;
  "artist-credit-id"?: string;
}

interface MusicBrainzResponse {
  recordings: MusicBrainzRecording[];
}

interface MusicBrainzData {
  title: string;
  recordingId: string;
  artistCreditId?: string;
  artistId?: string;
}

/**
 * MusicBrainz API로 ISRC 기반 곡 검색 (재시도 로직 포함)
 */
async function fetchTitleFromMusicBrainz(
  isrc: string,
  retries = 3,
): Promise<MusicBrainzData | undefined> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://musicbrainz.org/ws/2/recording/?query=isrc:${isrc}&fmt=json`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
        },
      });

      // 503 에러 시 재시도
      if (response.status === 503) {
        if (attempt < retries) {
          console.log(
            `  ⚠️  503 에러 발생, ${attempt}/${retries} 재시도 중... (5초 대기)`,
          );
          await sleep(5000);
          continue;
        }
        console.error(`  ❌ MusicBrainz API 오류 (503): ${isrc} - 재시도 실패`);
        return undefined;
      }

      if (!response.ok) {
        console.error(
          `  ❌ MusicBrainz API 오류 (${response.status}): ${isrc}`,
        );
        return undefined;
      }

      const data: MusicBrainzResponse = await response.json();

      if (data.recordings && data.recordings.length > 0) {
        const recording = data.recordings[0];
        const artistId = recording["artist-credit"]?.[0]?.artist?.id;

        return {
          title: recording.title,
          recordingId: recording.id,
          artistCreditId: recording["artist-credit-id"],
          artistId,
        };
      }

      console.log(`  ⚠️  MusicBrainz에서 결과 없음: ${isrc}`);
      return undefined;
    } catch (error) {
      if (attempt < retries) {
        console.log(
          `  ⚠️  네트워크 오류, ${attempt}/${retries} 재시도 중... (5초 대기)`,
        );
        await sleep(5000);
        continue;
      }
      console.error(`  ❌ MusicBrainz API 호출 실패: ${isrc}`, error);
      return undefined;
    }
  }
  return undefined;
}

/**
 * Rate limiting을 위한 sleep 함수
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 단일 아티스트의 트랙 처리
 */
async function processArtist(
  artistId: number,
  isDryRun: boolean,
): Promise<{ updated: number; skipped: number; error: number }> {
  // 아티스트 조회
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyArtist: {
        select: {
          id: true,
          spotifyId: true,
          tracks: {
            select: {
              spotifyTrack: true,
            },
          },
        },
      },
    },
  });

  if (!artist) {
    console.error(`❌ Artist not found: ${artistId}`);
    return { updated: 0, skipped: 0, error: 0 };
  }

  if (!artist.spotifyArtist) {
    console.log(`⏭️  Artist has no Spotify artist linked: ${artist.name}`);
    return { updated: 0, skipped: 0, error: 0 };
  }

  console.log(`\n🎵 Artist: ${artist.name} (${artist.nameKo})`);
  console.log(`📀 Spotify ID: ${artist.spotifyArtist.spotifyId}\n`);

  const tracks = artist.spotifyArtist.tracks.map((t) => t.spotifyTrack);
  console.log(`📊 Total tracks: ${tracks.length}\n`);

  const tracksWithIsrc = tracks.filter((t) => t.isrc);
  console.log(`✅ Tracks with ISRC: ${tracksWithIsrc.length}`);
  console.log(
    `⚠️  Tracks without ISRC: ${tracks.length - tracksWithIsrc.length}\n`,
  );

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < tracksWithIsrc.length; i++) {
    const track = tracksWithIsrc[i];
    const progress = `[${i + 1}/${tracksWithIsrc.length}]`;

    console.log(`${progress} ${track.name} (ISRC: ${track.isrc})`);

    // ISRC null 체크
    if (!track.isrc) {
      console.log(`  ⚠️  ISRC가 없음\n`);
      errorCount++;
      continue;
    }

    // 이미 musicBrainzRecordingId가 있으면 스킵 (제목만 있는 경우는 다시 조회)
    if ((track as any).musicBrainzRecordingId) {
      console.log(
        `  ⏭️  이미 저장됨: ${(track as any).musicBrainzTitle} (Recording ID: ${(track as any).musicBrainzRecordingId})\n`,
      );
      skippedCount++;
      continue;
    }

    // MusicBrainz API 호출
    const musicBrainzData = await fetchTitleFromMusicBrainz(track.isrc);

    if (musicBrainzData) {
      console.log(`  ✅ 발견: ${musicBrainzData.title}`);
      console.log(`     Recording ID: ${musicBrainzData.recordingId}`);
      if (musicBrainzData.artistCreditId) {
        console.log(`     Artist Credit ID: ${musicBrainzData.artistCreditId}`);
      }
      if (musicBrainzData.artistId) {
        console.log(`     Artist ID: ${musicBrainzData.artistId}`);
      }

      if (!isDryRun) {
        try {
          await prisma.spotifyTrack.update({
            where: { id: track.id },
            data: {
              musicBrainzTitle: musicBrainzData.title,
              musicBrainzRecordingId: musicBrainzData.recordingId,
              musicBrainzArtistCreditId: musicBrainzData.artistCreditId,
              musicBrainzArtistId: musicBrainzData.artistId,
            },
          });
          console.log(`  💾 DB 업데이트 완료\n`);
          updatedCount++;
        } catch (error) {
          console.error(`  ❌ DB 업데이트 실패:`, error);
          errorCount++;
        }
      } else {
        console.log(`  🔍 [DRY RUN] DB 업데이트 스킵\n`);
        updatedCount++;
      }
    } else {
      console.log(`  ❌ 제목을 찾을 수 없음\n`);
      errorCount++;
    }

    // Rate limiting: 1초당 1요청 (MusicBrainz 정책)
    if (i < tracksWithIsrc.length - 1) {
      await sleep(1000);
    }
  }

  console.log(`${"=".repeat(50)}`);
  console.log("📊 실행 결과:");
  console.log(`  ✅ 업데이트됨: ${updatedCount}`);
  console.log(`  ⏭️  스킵됨 (이미 존재): ${skippedCount}`);
  console.log(`  ❌ 실패/없음: ${errorCount}`);
  console.log(`${"=".repeat(50)}\n`);

  return { updated: updatedCount, skipped: skippedCount, error: errorCount };
}

async function main() {
  const args = process.argv.slice(2);
  const artistIdStr = args.find((arg) => !arg.startsWith("--"));
  const isDryRun = args.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 [DRY RUN MODE] 실제 DB 업데이트는 수행하지 않습니다.\n");
  }

  const startId = artistIdStr ? Number.parseInt(artistIdStr, 10) : 1;

  if (Number.isNaN(startId)) {
    console.error("❌ Error: artistId must be a number");
    process.exit(1);
  }

  console.log(`🔄 Artist ID ${startId}부터 끝까지 처리합니다.\n`);

  const artists = await prisma.artist.findMany({
    where: {
      id: {
        gte: startId,
      },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  console.log(`📊 처리할 아티스트 수: ${artists.length}\n`);

  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalError = 0;

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];
    console.log(`\n${"=".repeat(60)}`);
    console.log(
      `🎤 [${i + 1}/${artists.length}] Artist ID: ${artist.id} - ${artist.name}`,
    );
    console.log(`${"=".repeat(60)}`);

    const result = await processArtist(artist.id, isDryRun);
    totalUpdated += result.updated;
    totalSkipped += result.skipped;
    totalError += result.error;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log("🎯 전체 실행 결과:");
  console.log(`  📊 처리한 아티스트: ${artists.length}`);
  console.log(`  ✅ 업데이트됨: ${totalUpdated}`);
  console.log(`  ⏭️  스킵됨: ${totalSkipped}`);
  console.log(`  ❌ 실패/없음: ${totalError}`);
  console.log(`${"=".repeat(60)}\n`);
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
