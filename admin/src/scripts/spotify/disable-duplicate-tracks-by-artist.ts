/**
 * 여러 아티스트의 중복 트랙을 비활성화하는 스크립트
 *
 * 기능:
 * - ID가 300 미만인 모든 아티스트 조회
 * - 각 아티스트의 SpotifyTrack들을 조회
 * - 같은 제목(name)을 가진 트랙들 중 가장 오래된 것만 남기고 나머지 disabled
 * - releaseDate가 없는 트랙은 disabled 처리
 *
 * 중복 판단 기준:
 * - 같은 아티스트의 트랙 중 name이 완전히 동일한 경우
 * - releaseDate가 가장 오래된 것만 원본으로 간주
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/disable-duplicate-tracks-by-artist.ts --dry-run
 * pnpm ts-node src/scripts/spotify/disable-duplicate-tracks-by-artist.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { type Artist, PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface TrackInfo {
  id: number;
  spotifyId: string;
  name: string;
  releaseDate?: string;
  disabled: boolean;
}

async function processArtist(
  artist: Pick<Artist, "id" | "name" | "nameKo" | "spotifyId">,
  isDryRun: boolean,
) {
  const { id: artistId, name, nameKo, spotifyId } = artist;
  console.log(
    `\n=== [${artistId}] ${name} (${nameKo || ""}) 처리 중 ===\n`,
  );

  if (!spotifyId) {
    console.error(`❌ Artist ${artistId} (${name})의 spotifyId가 없습니다.`);
    return;
  }

  // 1. SpotifyArtist 조회
  const spotifyArtist = await prisma.spotifyArtist.findUnique({
    where: { spotifyId },
    select: { id: true },
  });

  if (!spotifyArtist) {
    console.error(`❌ SpotifyArtist를 찾을 수 없습니다. (Spotify ID: ${spotifyId})`);
    return;
  }

  // 2. 해당 아티스트의 모든 트랙 조회
  const artistTracks = await prisma.spotifyArtistTrack.findMany({
    where: { spotifyArtistId: spotifyArtist.id },
    include: {
      spotifyTrack: {
        select: {
          id: true,
          spotifyId: true,
          name: true,
          releaseDate: true,
          disabled: true,
        },
      },
    },
  });

  const tracks: TrackInfo[] = artistTracks.map((at) => ({
    id: at.spotifyTrack.id,
    spotifyId: at.spotifyTrack.spotifyId,
    name: at.spotifyTrack.name,
    releaseDate: at.spotifyTrack.releaseDate ?? undefined,
    disabled: at.spotifyTrack.disabled,
  }));

  console.log(`✓ 총 ${tracks.length}개의 트랙을 찾았습니다.`);

  // 3. name으로 그룹화
  const tracksByName = new Map<string, TrackInfo[]>();
  for (const track of tracks) {
    const existing = tracksByName.get(track.name) || [];
    existing.push(track);
    tracksByName.set(track.name, existing);
  }

  const duplicateGroups = Array.from(tracksByName.entries()).filter(
    ([_, tracks]) => tracks.length > 1,
  );

  if (duplicateGroups.length === 0) {
    console.log("✅ 중복 트랙이 없습니다.");
    return;
  }
  console.log(`✓ ${duplicateGroups.length}개의 중복 그룹을 찾았습니다.`);

  // 4. 각 그룹에서 비활성화할 트랙 결정
  const tracksToDisable: TrackInfo[] = [];

  for (const [name, groupTracks] of duplicateGroups) {
    const tracksWithDate = groupTracks.filter((t) => t.releaseDate);
    const tracksWithoutDate = groupTracks.filter((t) => !t.releaseDate);

    tracksToDisable.push(...tracksWithoutDate.filter((t) => !t.disabled));

    if (tracksWithDate.length > 1) {
      tracksWithDate.sort((a, b) => {
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return a.releaseDate.localeCompare(b.releaseDate);
      });
      const toDisable = tracksWithDate.slice(1).filter((t) => !t.disabled);
      tracksToDisable.push(...toDisable);
    }
  }

  if (tracksToDisable.length === 0) {
    console.log("✅ 새로 비활성화할 트랙이 없습니다.");
    return;
  }
  console.log(`🚫 비활성화 필요: ${tracksToDisable.length}개`);

  // 5. 비활성화 실행
  if (!isDryRun) {
    const trackIdsToDisable = tracksToDisable.map((t) => t.id);
    const result = await prisma.spotifyTrack.updateMany({
      where: {
        id: {
          in: trackIdsToDisable,
        },
      },
      data: {
        disabled: true,
      },
    });
    console.log(`✓ ${result.count}개의 트랙을 비활성화했습니다.`);
  } else {
    console.log(
      `💡 DRY RUN: ${tracksToDisable.length}개의 트랙을 비활성화할 예정입니다.`,
    );
    // 드라이런 시 샘플 출력
    duplicateGroups.slice(0, 5).forEach(([name, groupTracks], index) => {
      console.log(`\n  샘플 ${index + 1}: "${name}" (${groupTracks.length}개)`);
      groupTracks.forEach((track) => {
        const status = !track.releaseDate
          ? "❌ 날짜 없음"
          : tracksToDisable.some((t) => t.id === track.id)
            ? "🚫 비활성화 예정"
            : "✅ 유지";
        const date = track.releaseDate || "N/A";
        console.log(`     [${track.id}] ${date} - ${status}`);
      });
    });
  }
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(
    `\n=== ID < 300 아티스트 중복 트랙 비활성화 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
  );

  // 1. ID < 300 아티스트 정보 조회
  console.log("Step 1: 대상 아티스트 조회 중 (ID < 300)...");
  const artists = await prisma.artist.findMany({
    where: { id: { lt: 300 } },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`✓ 총 ${artists.length}명의 아티스트를 처리합니다.\n`);

  // 2. 각 아티스트에 대해 중복 처리 실행
  for (const artist of artists) {
    try {
      await processArtist(artist, isDryRun);
    } catch (e) {
      console.error(
        `\n❌ [${artist.id}] ${artist.name} 처리 중 오류 발생:`,
        e,
      );
    }
  }

  console.log("\n\n✅ 모든 아티스트 처리가 완료되었습니다.");

  if (isDryRun) {
    console.log(
      `\n💡 실제 업데이트를 수행하려면 --dry-run 없이 다시 실행하세요.`,
    );
  }
}

main()
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 중 심각한 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
