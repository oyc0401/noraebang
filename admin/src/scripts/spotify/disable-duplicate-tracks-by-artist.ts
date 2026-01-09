/**
 * 특정 아티스트의 중복 트랙을 비활성화하는 스크립트
 *
 * 기능:
 * - 특정 아티스트의 SpotifyTrack들을 조회
 * - 같은 제목(name)을 가진 트랙들 중 가장 오래된 것만 남기고 나머지 disabled
 * - releaseDate가 없는 트랙은 disabled 처리
 *
 * 중복 판단 기준:
 * - 같은 아티스트의 트랙 중 name이 완전히 동일한 경우
 * - releaseDate가 가장 오래된 것만 원본으로 간주
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/disable-duplicate-tracks-by-artist.ts 1 --dry-run
 * pnpm ts-node src/scripts/spotify/disable-duplicate-tracks-by-artist.ts 1
 *
 * 주의:
 * - artistId는 필수 인자입니다
 * - SpotifyArtist가 존재해야 합니다
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

interface TrackInfo {
  id: number;
  spotifyId: string;
  name: string;
  releaseDate?: string;
  disabled: boolean;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");
  const artistIdArg = process.argv[2];

  if (!artistIdArg || artistIdArg.includes("--")) {
    console.error("❌ artistId는 필수 인자입니다.");
    console.error("\n사용법:");
    console.error(
      "  pnpm ts-node src/scripts/spotify/disable-duplicate-tracks-by-artist.ts <artistId> [--dry-run]",
    );
    console.error("\n예시:");
    console.error(
      "  pnpm ts-node src/scripts/spotify/disable-duplicate-tracks-by-artist.ts 1 --dry-run",
    );
    process.exit(1);
  }

  const artistId = Number.parseInt(artistIdArg, 10);
  if (Number.isNaN(artistId)) {
    console.error("❌ artistId는 숫자여야 합니다.");
    process.exit(1);
  }

  console.log(
    `\n=== 아티스트 ${artistId}의 중복 트랙 비활성화 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
  );

  // 1. Artist 정보 조회
  console.log("Step 1: Artist 정보 조회 중...");
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
    console.error(`❌ Artist ${artistId}를 찾을 수 없습니다.`);
    process.exit(1);
  }

  if (!artist.spotifyId) {
    console.error(`❌ Artist ${artistId} (${artist.name})의 spotifyId가 없습니다.`);
    process.exit(1);
  }

  console.log(`✓ Artist: ${artist.name} (${artist.nameKo || ""})\n`);

  // 2. SpotifyArtist 조회
  console.log("Step 2: SpotifyArtist 조회 중...");
  const spotifyArtist = await prisma.spotifyArtist.findUnique({
    where: { spotifyId: artist.spotifyId },
    select: { id: true },
  });

  if (!spotifyArtist) {
    console.error(`❌ SpotifyArtist를 찾을 수 없습니다.`);
    process.exit(1);
  }

  console.log(`✓ SpotifyArtist ID: ${spotifyArtist.id}\n`);

  // 3. 해당 아티스트의 모든 트랙 조회
  console.log("Step 3: 트랙 조회 중...");
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

  console.log(`✓ 총 ${tracks.length}개의 트랙을 찾았습니다.\n`);

  // 4. name으로 그룹화
  console.log("Step 4: 중복 트랙 분석 중...");
  const tracksByName = new Map<string, TrackInfo[]>();

  for (const track of tracks) {
    const existing = tracksByName.get(track.name) || [];
    existing.push(track);
    tracksByName.set(track.name, existing);
  }

  // 중복이 있는 그룹만 필터링
  const duplicateGroups = Array.from(tracksByName.entries()).filter(
    ([_, tracks]) => tracks.length > 1,
  );

  console.log(`✓ ${duplicateGroups.length}개의 중복 그룹을 찾았습니다.\n`);

  if (duplicateGroups.length === 0) {
    console.log("✅ 중복 트랙이 없습니다.");
    return;
  }

  // 5. 각 그룹에서 비활성화할 트랙 결정
  const tracksToDisable: TrackInfo[] = [];

  for (const [name, groupTracks] of duplicateGroups) {
    // releaseDate가 있는 트랙들과 없는 트랙들 분리
    const tracksWithDate = groupTracks.filter((t) => t.releaseDate);
    const tracksWithoutDate = groupTracks.filter((t) => !t.releaseDate);

    // releaseDate가 없는 트랙들은 모두 비활성화 대상
    tracksToDisable.push(...tracksWithoutDate.filter((t) => !t.disabled));

    // releaseDate가 있는 트랙들 중 가장 오래된 것만 남기고 나머지 비활성화
    if (tracksWithDate.length > 0) {
      // releaseDate로 정렬 (오래된 순)
      tracksWithDate.sort((a, b) => {
        if (!a.releaseDate) return 1;
        if (!b.releaseDate) return -1;
        return a.releaseDate.localeCompare(b.releaseDate);
      });

      // 첫 번째(가장 오래된 것)를 제외한 나머지 비활성화
      const toDisable = tracksWithDate.slice(1).filter((t) => !t.disabled);
      tracksToDisable.push(...toDisable);
    }
  }

  // 6. 통계 출력
  console.log("=== 통계 ===");
  console.log(`📊 전체 트랙: ${tracks.length}개`);
  console.log(`🔍 중복 그룹: ${duplicateGroups.length}개`);
  console.log(`🚫 비활성화 필요: ${tracksToDisable.length}개\n`);

  if (tracksToDisable.length === 0) {
    console.log("✅ 비활성화할 트랙이 없습니다.");
    return;
  }

  // 7. 샘플 출력
  console.log("=== 중복 그룹 샘플 (최대 5개) ===");
  duplicateGroups.slice(0, 5).forEach(([name, groupTracks], index) => {
    console.log(`\n${index + 1}. "${name}" (${groupTracks.length}개)`);

    groupTracks.forEach((track) => {
      const status = !track.releaseDate
        ? "❌ 날짜 없음"
        : tracksToDisable.some((t) => t.id === track.id)
          ? "🚫 비활성화 예정"
          : "✅ 유지";
      const date = track.releaseDate || "N/A";
      console.log(`   [${track.id}] ${date} - ${status}`);
    });
  });
  console.log();

  // 8. 비활성화 실행
  if (!isDryRun && tracksToDisable.length > 0) {
    console.log("Step 5: 트랙 비활성화 중...");

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

    console.log(`✓ ${result.count}개의 트랙을 비활성화했습니다.\n`);
  }

  // 9. 결과 출력
  console.log("=== 결과 ===");
  if (isDryRun) {
    console.log(
      `💡 실제 업데이트를 수행하려면 --dry-run 없이 다시 실행하세요.`,
    );
  } else {
    console.log(`✅ ${tracksToDisable.length}개의 중복 트랙을 비활성화했습니다!`);
  }
}

main()
  .catch((error) => {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
