/**
 * ID < 300 아티스트 범위에서 SpotifyTrack disabled 상태를 "완전 재계산"하는 통합 스크립트
 *
 * 최종 규칙(중요):
 * - "제거 대상"만 disabled=true
 * - "제거 대상이 아닌 것"은 모두 disabled=false (기존에 true였어도 무조건 풀림)
 *
 * 제거 대상(= disabled=true):
 * 1) 같은 아티스트 내에서 track.name이 완전히 동일한 중복 그룹:
 *    - popularity가 가장 높은 1개만 원본(keep)
 *    - 나머지는 제거 대상
 *    - popularity 동률이면 id가 가장 작은 것을 keep (결정적/안정적)
 *
 * 2) 이름 패턴으로 중복으로 판단되는 트랙:
 *    - isDuplicateTrack(track.name) === true 이면 제거 대상
 *
 * 범위:
 * - artist.id < 300 인 아티스트들의 spotifyId로 연결된 spotifyArtist의 트랙들만 스캔/업데이트
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/disable-duplicate-tracks.ts --dry-run
 * pnpm ts-node src/scripts/spotify/disable-duplicate-tracks.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { isDuplicateTrack } from "../../lib/duplicate-track-detector.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type TrackInfo = {
  id: number;
  spotifyId: string;
  name: string;
  popularity: number | null;
  disabled: boolean;
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function popularityScore(p: number | null | undefined): number {
  // popularity가 없으면 가장 낮게 취급
  return typeof p === "number" ? p : -1;
}

function pickKeepByPopularity(tracks: TrackInfo[]): TrackInfo {
  // popularity desc, id asc (tie-break)
  return tracks.slice().sort((a, b) => {
    const pa = popularityScore(a.popularity);
    const pb = popularityScore(b.popularity);
    if (pa !== pb) return pb - pa;
    return a.id - b.id;
  })[0]!;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(
    `\n=== ID < 300 범위 Track disabled 재계산 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
  );

  // 1) 대상 아티스트 조회
  console.log("Step 1: 대상 아티스트 조회 중 (artist.id < 300) ...");
  const artists = await prisma.artist.findMany({
    where: { id: { lt: 300 } },
    select: { id: true, name: true, spotifyId: true },
    orderBy: { id: "asc" },
  });

  const spotifyIds = artists
    .map((a) => a.spotifyId)
    .filter(Boolean) as string[];
  console.log(
    `✓ artists: ${artists.length}명, spotifyId 보유: ${spotifyIds.length}명\n`,
  );

  if (spotifyIds.length === 0) {
    console.log("✅ spotifyId 보유 아티스트가 없습니다. 종료합니다.");
    return;
  }

  // 2) spotifyId -> spotifyArtist.id 매핑
  console.log("Step 2: SpotifyArtist 매핑 조회 중 ...");
  const spotifyArtists = await prisma.spotifyArtist.findMany({
    where: { spotifyId: { in: spotifyIds } },
    select: { id: true, spotifyId: true },
  });

  const spotifyIdToSpotifyArtistId = new Map<string, number>();
  for (const sa of spotifyArtists)
    spotifyIdToSpotifyArtistId.set(sa.spotifyId, sa.id);

  const targetSpotifyArtistIds = artists
    .map((a) => a.spotifyId && spotifyIdToSpotifyArtistId.get(a.spotifyId))
    .filter((v): v is number => typeof v === "number");

  console.log(
    `✓ spotifyArtists found: ${spotifyArtists.length}개, target spotifyArtistIds: ${targetSpotifyArtistIds.length}개\n`,
  );

  if (targetSpotifyArtistIds.length === 0) {
    console.log("✅ 매핑된 SpotifyArtist가 없습니다. 종료합니다.");
    return;
  }

  // 3) 대상 spotifyArtistId들의 트랙 링크 조회 (한 번에)
  console.log("Step 3: 대상 아티스트의 트랙 링크 조회 중 ...");
  const links = await prisma.spotifyArtistTrack.findMany({
    where: { spotifyArtistId: { in: targetSpotifyArtistIds } },
    select: {
      spotifyArtistId: true,
      spotifyTrack: {
        select: {
          id: true,
          spotifyId: true,
          name: true,
          popularity: true, // <-- 스키마에 있어야 합니다 (요구사항)
          disabled: true,
        },
      },
    },
  });

  console.log(`✓ spotifyArtistTrack links: ${links.length}개\n`);

  // 4) spotifyArtistId -> tracks[], 그리고 scope track set 구성
  const tracksBySpotifyArtistId = new Map<number, TrackInfo[]>();
  const trackById = new Map<number, TrackInfo>();

  for (const row of links) {
    const t = row.spotifyTrack;
    const info: TrackInfo = {
      id: t.id,
      spotifyId: t.spotifyId,
      name: t.name,
      popularity: t.popularity,
      disabled: t.disabled,
    };

    // per-artist grouping용
    const arr = tracksBySpotifyArtistId.get(row.spotifyArtistId) ?? [];
    arr.push(info);
    tracksBySpotifyArtistId.set(row.spotifyArtistId, arr);

    // scope unique tracks용
    if (!trackById.has(info.id)) trackById.set(info.id, info);
  }

  const scopeTrackIds = Array.from(trackById.keys());
  console.log(`✓ scope unique tracks: ${scopeTrackIds.length}개\n`);

  if (scopeTrackIds.length === 0) {
    console.log("✅ 대상 트랙이 없습니다. 종료합니다.");
    return;
  }

  // 5) 제거 대상 계산
  const disableSet = new Set<number>();

  // 5-1) 패턴 기반 제거 대상
  let patternDupCount = 0;
  for (const t of trackById.values()) {
    if (isDuplicateTrack(t.name)) {
      disableSet.add(t.id);
      patternDupCount++;
    }
  }

  // 5-2) 같은 아티스트 내 name 완전 동일 중복
  let exactNameDupGroups = 0;
  let exactNameDisabled = 0;

  // dry-run 샘플 출력용
  const sampleGroups: Array<{
    spotifyArtistId: number;
    name: string;
    keep: TrackInfo;
    disable: TrackInfo[];
  }> = [];

  for (const [spotifyArtistId, tracks] of tracksBySpotifyArtistId.entries()) {
    const byName = new Map<string, TrackInfo[]>();
    for (const t of tracks) {
      const list = byName.get(t.name) ?? [];
      list.push(t);
      byName.set(t.name, list);
    }

    for (const [name, group] of byName.entries()) {
      if (group.length <= 1) continue;

      exactNameDupGroups++;
      const keep = pickKeepByPopularity(group);
      const toDisable = group.filter((x) => x.id !== keep.id);

      for (const x of toDisable) {
        if (!disableSet.has(x.id)) exactNameDisabled++;
        disableSet.add(x.id);
      }

      if (isDryRun && sampleGroups.length < 8) {
        sampleGroups.push({
          spotifyArtistId,
          name,
          keep,
          disable: toDisable,
        });
      }
    }
  }

  const disableIds = Array.from(disableSet);
  const enableCount = scopeTrackIds.length - disableIds.length;

  // 6) 통계
  const currentlyDisabled = Array.from(trackById.values()).filter(
    (t) => t.disabled,
  ).length;

  console.log("=== 통계 ===");
  console.log(`📦 scope tracks: ${scopeTrackIds.length}`);
  console.log(`🔍 패턴 중복(isDuplicateTrack): ${patternDupCount}`);
  console.log(`🔁 name 완전 동일 중복 그룹: ${exactNameDupGroups}`);
  console.log(
    `  - name 중복으로 추가 disable된 트랙(누적/대략): ${exactNameDisabled}`,
  );
  console.log(`🚫 최종 제거 대상(disabled=true): ${disableIds.length}`);
  console.log(`✅ 최종 유지 대상(disabled=false): ${enableCount}`);
  console.log(`ℹ️ 현재 disabled=true(스코프 내): ${currentlyDisabled}\n`);

  if (isDryRun) {
    console.log("=== DRY RUN 샘플 (name 완전 동일 중복) ===");
    for (const g of sampleGroups) {
      console.log(
        `\n- spotifyArtistId=${g.spotifyArtistId}  name="${g.name}"  (${1 + g.disable.length}개)`,
      );
      console.log(
        `  KEEP  [${g.keep.id}] pop=${popularityScore(g.keep.popularity)} disabled=${g.keep.disabled}`,
      );
      for (const d of g.disable) {
        console.log(
          `  DROP  [${d.id}] pop=${popularityScore(d.popularity)} disabled=${d.disabled}`,
        );
      }
    }

    const patternSamples = Array.from(trackById.values())
      .filter((t) => isDuplicateTrack(t.name))
      .slice(0, 10);

    console.log("\n=== DRY RUN 샘플 (패턴 중복) ===");
    patternSamples.forEach((t, i) => {
      console.log(
        `${i + 1}. [${t.id}] pop=${popularityScore(t.popularity)} disabled=${t.disabled}  ${t.name}`,
      );
    });

    console.log("\n💡 DRY RUN: 실제 DB 업데이트는 수행하지 않습니다.");
    return;
  }

  // 7) DB 업데이트 (요구사항대로 '완전 재계산'):
  //    7-1) scope 전체를 disabled=false로 먼저 리셋
  //    7-2) 제거 대상만 disabled=true로 세팅
  console.log("Step 4: DB 업데이트 중 ...");
  const CHUNK = 5000;

  console.log(
    `- (1/2) scope 전체 disabled=false 리셋 (${scopeTrackIds.length}개)`,
  );
  for (const ids of chunkArray(scopeTrackIds, CHUNK)) {
    await prisma.spotifyTrack.updateMany({
      where: { id: { in: ids } },
      data: { disabled: false },
    });
  }

  console.log(`- (2/2) 제거 대상 disabled=true 세팅 (${disableIds.length}개)`);
  for (const ids of chunkArray(disableIds, CHUNK)) {
    await prisma.spotifyTrack.updateMany({
      where: { id: { in: ids } },
      data: { disabled: true },
    });
  }

  console.log(
    "\n✅ 완료: 제거 대상만 disabled=true, 나머지는 모두 disabled=false로 정리했습니다.",
  );
}

main()
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 중 오류:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
