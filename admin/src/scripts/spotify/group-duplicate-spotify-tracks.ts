/**
 * 같은 스포티파이 곡끼리 SpotifyTrackGroup으로 그룹을 짓는 스크립트
 *
 * 규칙:
 * 1. 같은 아티스트 내에서 track.name 또는 musicBrainzTitle이 완전히 동일한 트랙들을 그룹화
 * 2. 이미 그룹에 속한 트랙이 있다면 그 그룹에 나머지 트랙들도 추가
 * 3. 그룹이 없다면 새 SpotifyTrackGroup 생성 (기존 Song과 연결하거나 새 Song 생성)
 * 4. popularity가 가장 높은 트랙을 primary로 설정 (popularity 동률이면 id가 작은 것)
 * 5. isDuplicateTrack으로 판단되는 트랙은 그룹화에서 제외 (전처리)
 *
 * 범위:
 * - artist.id < 300 인 아티스트들의 spotifyId로 연결된 spotifyArtist의 트랙들만 스캔/업데이트
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/group-duplicate-spotify-tracks.ts --dry-run
 * pnpm ts-node src/scripts/spotify/group-duplicate-spotify-tracks.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { isDuplicateTrack } from "../../lib/duplicate-track-detector.ts";
import { findBestMatch } from "../../lib/song-spotify-matcher.ts";
import { normalizeTitle as normalizeTrackTitle } from "../../lib/track-title-normalizer.ts";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type TrackInfo = {
  id: number;
  spotifyId: string;
  name: string;
  musicBrainzTitle: string | null;
  popularity: number | null;
  groupId: number | null;
  releaseDate: string | null;
  isDuplicateVariant: boolean; // 라이브, 리믹스 등 변형 버전 여부
};

function popularityScore(p: number | null | undefined): number {
  return typeof p === "number" ? p : -1;
}

function pickPrimaryByPopularity(tracks: TrackInfo[]): TrackInfo {
  // popularity desc, releaseDate desc (최신 우선), id asc (tie-break)
  return tracks.slice().sort((a, b) => {
    const pa = popularityScore(a.popularity);
    const pb = popularityScore(b.popularity);
    if (pa !== pb) return pb - pa;

    // releaseDate 비교 (최신이 먼저, null은 뒤로)
    if (a.releaseDate && b.releaseDate) {
      return b.releaseDate.localeCompare(a.releaseDate);
    }
    if (a.releaseDate && !b.releaseDate) return -1;
    if (!a.releaseDate && b.releaseDate) return 1;

    return a.id - b.id;
  })[0]!;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(
    `\n=== SpotifyTrackGroup 자동 생성 스크립트 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
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

  // 3) 대상 spotifyArtistId들의 트랙 링크 조회
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
          musicBrainzTitle: true,
          popularity: true,
          groupId: true,
          releaseDate: true,
        },
      },
    },
  });

  console.log(`✓ spotifyArtistTrack links: ${links.length}개\n`);

  // 4) spotifyArtistId -> tracks[] 구성
  const tracksBySpotifyArtistId = new Map<number, TrackInfo[]>();
  const trackById = new Map<number, TrackInfo>();

  let duplicateVariantCount = 0;

  for (const row of links) {
    const t = row.spotifyTrack;

    // 변형 버전 여부 판단 (라이브, 리믹스, 인스트루멘탈 등)
    const isDupVariant = isDuplicateTrack(t.name);
    if (isDupVariant) duplicateVariantCount++;

    const info: TrackInfo = {
      id: t.id,
      spotifyId: t.spotifyId,
      name: t.name,
      musicBrainzTitle: t.musicBrainzTitle,
      popularity: t.popularity,
      groupId: t.groupId,
      releaseDate: t.releaseDate,
      isDuplicateVariant: isDupVariant,
    };

    // per-artist grouping용
    const arr = tracksBySpotifyArtistId.get(row.spotifyArtistId) ?? [];
    arr.push(info);
    tracksBySpotifyArtistId.set(row.spotifyArtistId, arr);

    // scope unique tracks용
    if (!trackById.has(info.id)) trackById.set(info.id, info);
  }

  console.log(
    `✓ 변형 버전 트랙(라이브/리믹스 등): ${duplicateVariantCount}개 (그룹에 포함, primary 가능)`,
  );
  console.log(`✓ 그룹화 대상 unique tracks: ${trackById.size}개\n`);

  if (trackById.size === 0) {
    console.log("✅ 그룹화 대상 트랙이 없습니다. 종료합니다.");
    return;
  }

  // 5) 같은 아티스트 내 name/musicBrainzTitle 중복 그룹화 (Union-Find)
  type GroupInfo = {
    tracks: TrackInfo[];
    primary: TrackInfo;
  };

  const groupsToCreate: GroupInfo[] = [];
  let totalGroupedTracks = 0;

  for (const [spotifyArtistId, tracks] of tracksBySpotifyArtistId.entries()) {
    if (tracks.length === 0) continue;

    // Union-Find: 제목이 겹치는 곡들을 그룹화
    const parent = new Map<number, number>();

    function find(x: number): number {
      if (!parent.has(x)) parent.set(x, x);
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    }

    function union(x: number, y: number) {
      const rootX = find(x);
      const rootY = find(y);
      if (rootX !== rootY) {
        parent.set(rootX, rootY);
      }
    }

    // 제목별 트랙 ID 매핑 (정규화된 제목으로)
    const titleToTrackIds = new Map<string, number[]>();

    for (const track of tracks) {
      // name으로 매핑 (정규화)
      const normalizedName = normalizeTrackTitle(track.name);
      const nameList = titleToTrackIds.get(normalizedName) ?? [];
      nameList.push(track.id);
      titleToTrackIds.set(normalizedName, nameList);

      // musicBrainzTitle로도 매핑 (정규화)
      if (track.musicBrainzTitle) {
        const normalizedMb = normalizeTrackTitle(track.musicBrainzTitle);
        // 정규화 후에도 다르면 추가 매핑
        if (normalizedMb !== normalizedName) {
          const mbList = titleToTrackIds.get(normalizedMb) ?? [];
          mbList.push(track.id);
          titleToTrackIds.set(normalizedMb, mbList);
        }
      }
    }

    // 같은 제목을 가진 트랙들끼리 union
    for (const trackIds of titleToTrackIds.values()) {
      if (trackIds.length <= 1) continue;
      for (let i = 1; i < trackIds.length; i++) {
        union(trackIds[0], trackIds[i]);
      }
    }

    // 그룹별로 트랙 모으기
    const groups = new Map<number, TrackInfo[]>();
    for (const track of tracks) {
      const root = find(track.id);
      const list = groups.get(root) ?? [];
      list.push(track);
      groups.set(root, list);
    }

    // 각 그룹 처리
    for (const group of groups.values()) {
      if (group.length === 0) continue;

      totalGroupedTracks += group.length;

      // primary 선택
      const primary = pickPrimaryByPopularity(group);

      groupsToCreate.push({
        tracks: group,
        primary,
      });
    }
  }

  console.log(`✓ 생성할 그룹 수: ${groupsToCreate.length}개`);
  console.log(`✓ 그룹화될 트랙 수: ${totalGroupedTracks}개\n`);

  // 6) 변형 버전 솔로 그룹 재배치
  console.log("Step 6: 변형 버전 솔로 그룹 재배치 중 ...");

  type RelocateInfo = {
    variantTrackId: number;
    variantTrackName: string;
    fromGroupId: number;
    toGroupId: number;
    matchedTrackName: string;
  };

  const relocateList: RelocateInfo[] = [];

  for (const [spotifyArtistId, tracks] of tracksBySpotifyArtistId.entries()) {
    // 변형 버전 트랙만 필터링
    const variantTracks = tracks.filter((t) => t.isDuplicateVariant);

    for (const variantTrack of variantTracks) {
      // 그룹이 없으면 스킵
      if (!variantTrack.groupId) continue;

      // 해당 그룹에 속한 트랙 수 확인 (메모리에서 체크)
      const groupTracks = tracks.filter(
        (t) => t.groupId === variantTrack.groupId,
      );

      // 솔로가 아니면 스킵
      if (groupTracks.length > 1) continue;

      // 다른 원본 트랙들 (변형 아니고, 그룹이 있는 것들)
      const originalTracks = tracks.filter(
        (t) =>
          t.id !== variantTrack.id &&
          !t.isDuplicateVariant &&
          t.groupId !== null,
      );

      if (originalTracks.length === 0) continue;

      // findBestMatch로 매칭 시도
      const candidates = originalTracks.map((t) => t.name);
      const matchResult = findBestMatch(variantTrack.name, candidates);

      if (matchResult.answer) {
        // answer와 일치하는 트랙 찾기
        const matchedTrack = originalTracks.find(
          (t) => t.name === matchResult.answer,
        );

        if (matchedTrack?.groupId) {
          // 재배치 정보 저장
          relocateList.push({
            variantTrackId: variantTrack.id,
            variantTrackName: variantTrack.name,
            fromGroupId: variantTrack.groupId,
            toGroupId: matchedTrack.groupId,
            matchedTrackName: matchedTrack.name,
          });

          // 메모리에서도 업데이트 (이후 DB 업데이트용)
          variantTrack.groupId = matchedTrack.groupId;
        }
      }
    }
  }

  console.log(`✓ 재배치할 변형 버전 트랙: ${relocateList.length}개\n`);

  if (isDryRun) {
    console.log("=== DRY RUN 샘플 (그룹 예시) ===");

    // 샘플 처리 전에 그룹 정보 미리 조회
    const allExistingGroupIds = groupsToCreate.flatMap((g) =>
      g.tracks.map((t) => t.groupId).filter((id): id is number => id !== null),
    );
    const uniqueExistingGroupIds = Array.from(new Set(allExistingGroupIds));

    const groupsInfoMap = new Map<
      number,
      { id: number; songId: number | null }
    >();
    if (uniqueExistingGroupIds.length > 0) {
      const groupsInfo = await prisma.spotifyTrackGroup.findMany({
        where: { id: { in: uniqueExistingGroupIds } },
        select: { id: true, songId: true },
      });
      for (const info of groupsInfo) {
        groupsInfoMap.set(info.id, info);
      }
    }

    for (const g of groupsToCreate.slice(0, 10)) {
      const titles = new Set<string>();
      for (const t of g.tracks) {
        titles.add(t.name);
        if (t.musicBrainzTitle) titles.add(t.musicBrainzTitle);
      }

      const existingGroupIds = g.tracks
        .map((t) => t.groupId)
        .filter((id): id is number => id !== null);
      const uniqueGroupIds = Array.from(new Set(existingGroupIds));

      console.log(
        `\n그룹: "${Array.from(titles).join(" / ")}" (${g.tracks.length}개 트랙)`,
      );
      console.log(
        `  기존 그룹 ID: ${uniqueGroupIds.length > 0 ? uniqueGroupIds.join(", ") : "없음 (신규 생성)"}`,
      );

      if (uniqueGroupIds.length > 1) {
        const mainGroupId = uniqueGroupIds[0];
        const mainGroupInfo = groupsInfoMap.get(mainGroupId);
        const mainHasSong = mainGroupInfo?.songId !== null;

        console.log(`  ⚠️  여러 그룹 병합 예정:`);
        for (const mergeGroupId of uniqueGroupIds.slice(1)) {
          const mergeGroupInfo = groupsInfoMap.get(mergeGroupId);
          const mergeHasSong = mergeGroupInfo?.songId !== null;

          if (mergeHasSong && mainHasSong) {
            console.log(
              `      그룹[${mergeGroupId}] Song[${mergeGroupInfo!.songId}] - Song 충돌로 병합 스킵`,
            );
          } else if (mergeHasSong && !mainHasSong) {
            console.log(
              `      그룹[${mergeGroupId}] Song[${mergeGroupInfo!.songId}] - Song 이전 후 삭제`,
            );
          } else {
            console.log(`      그룹[${mergeGroupId}] - 삭제 예정`);
          }
        }
      }

      console.log(
        `  PRIMARY [${g.primary.id}] pop=${popularityScore(g.primary.popularity)} release=${g.primary.releaseDate || "없음"} groupId=${g.primary.groupId}${g.primary.isDuplicateVariant ? " [변형버전!]" : ""}`,
      );
      for (const t of g.tracks.filter((x) => x.id !== g.primary.id)) {
        console.log(
          `          [${t.id}] pop=${popularityScore(t.popularity)} release=${t.releaseDate || "없음"} groupId=${t.groupId}${t.isDuplicateVariant ? " [변형]" : ""}`,
        );
      }
    }

    if (relocateList.length > 0) {
      console.log("\n=== DRY RUN 샘플 (변형 버전 재배치) ===");
      for (const r of relocateList.slice(0, 10)) {
        console.log(`\n트랙[${r.variantTrackId}] "${r.variantTrackName}"`);
        console.log(`  그룹[${r.fromGroupId}] (솔로) → 그룹[${r.toGroupId}]`);
        console.log(`  매칭된 원본: "${r.matchedTrackName}"`);
      }
    }

    console.log("\n💡 DRY RUN: 실제 DB 업데이트는 수행하지 않습니다.");
    return;
  }

  // 6) DB 업데이트
  console.log("Step 4: SpotifyTrackGroup 생성 및 트랙 업데이트 중 ...");

  let createdGroupCount = 0;
  let updatedTrackCount = 0;
  let mergedGroupCount = 0;
  let songConflictCount = 0;
  const groupIdMapping = new Map<number, number>(); // oldGroupId -> newGroupId
  const createdOrUsedGroupIds: number[] = []; // primary 설정을 위해 추적

  for (const group of groupsToCreate) {
    // 여러 기존 그룹이 있는지 확인
    const existingGroupIds = group.tracks
      .map((t) => t.groupId)
      .filter((id): id is number => id !== null);
    const uniqueGroupIds = Array.from(new Set(existingGroupIds));

    let groupId: number;

    if (uniqueGroupIds.length === 0) {
      const newGroup = await prisma.spotifyTrackGroup.create({
        data: {},
      });
      groupId = newGroup.id;
      createdGroupCount++;
    } else {
      // 기존 그룹 사용 (첫 번째 그룹)
      groupId = uniqueGroupIds[0];

      // 여러 기존 그룹이 있으면 먼저 병합 처리
      if (uniqueGroupIds.length > 1) {
        const groupsToMerge = uniqueGroupIds.slice(1);

        // 병합할 그룹들의 Song 정보 조회
        const groupsInfo = await prisma.spotifyTrackGroup.findMany({
          where: { id: { in: [groupId, ...groupsToMerge] } },
          select: { id: true, songId: true },
        });

        const mainGroupInfo = groupsInfo.find((g) => g.id === groupId);
        let mainHasSong = mainGroupInfo?.songId !== null;

        for (const mergeGroupId of groupsToMerge) {
          const mergeGroupInfo = groupsInfo.find((g) => g.id === mergeGroupId);
          const mergeHasSong = mergeGroupInfo?.songId !== null;

          if (mergeHasSong) {
            if (!mainHasSong) {
              // 메인 그룹에 Song 없고, 병합 그룹에 Song 있으면 → Song 이전
              await prisma.spotifyTrackGroup.update({
                where: { id: groupId },
                data: { songId: mergeGroupInfo!.songId },
              });
              console.log(
                `  ℹ️  그룹[${mergeGroupId}]의 Song[${mergeGroupInfo!.songId}]을 그룹[${groupId}]로 이전`,
              );

              // 이제 메인 그룹에 Song이 생겼으므로 플래그 업데이트
              mainHasSong = true;
            } else {
              // 양쪽 다 Song 있으면 → 충돌, 삭제 안함
              console.log(
                `  ⚠️  Song 충돌: 그룹[${groupId}]의 Song[${mainGroupInfo!.songId}] vs 그룹[${mergeGroupId}]의 Song[${mergeGroupInfo!.songId}] - 병합 스킵`,
              );
              songConflictCount++;
              continue; // 이 그룹은 삭제하지 않음
            }
          }

          // 병합 매핑 저장 (oldGroupId -> newGroupId)
          groupIdMapping.set(mergeGroupId, groupId);

          // Song 충돌이 없으면 그룹 삭제
          await prisma.spotifyTrackGroup.delete({
            where: { id: mergeGroupId },
          });
          mergedGroupCount++;
        }
      }
    }

    createdOrUsedGroupIds.push(groupId);

    // 모든 트랙의 groupId 업데이트
    const trackIds = group.tracks.map((t) => t.id);
    await prisma.spotifyTrack.updateMany({
      where: { id: { in: trackIds } },
      data: { groupId },
    });
    updatedTrackCount += trackIds.length;
  }

  console.log(`✓ 신규 생성된 그룹: ${createdGroupCount}개`);
  console.log(`✓ 병합/삭제된 그룹: ${mergedGroupCount}개`);
  console.log(`✓ Song 충돌로 병합 스킵: ${songConflictCount}개`);
  console.log(`✓ 업데이트된 트랙: ${updatedTrackCount}개\n`);

  // 8) 변형 버전 재배치 처리
  if (relocateList.length > 0) {
    console.log("Step 7: 변형 버전 재배치 처리 중 ...");

    // 재배치할 트랙들 groupId 업데이트
    let relocatedCount = 0;
    let skippedCount = 0;

    for (const r of relocateList) {
      // toGroupId가 병합되어 삭제되었는지 확인
      let actualGroupId = r.toGroupId;

      // 병합 매핑 체인 따라가기
      while (groupIdMapping.has(actualGroupId)) {
        actualGroupId = groupIdMapping.get(actualGroupId)!;
      }

      // actualGroupId가 실제 존재하는지 확인
      const groupExists = await prisma.spotifyTrackGroup.findUnique({
        where: { id: actualGroupId },
        select: { id: true },
      });

      if (groupExists) {
        await prisma.spotifyTrack.update({
          where: { id: r.variantTrackId },
          data: { groupId: actualGroupId },
        });
        relocatedCount++;
      } else {
        console.log(
          `  ⚠️  트랙[${r.variantTrackId}] 재배치 스킵: 대상 그룹[${r.toGroupId}]이 존재하지 않음`,
        );
        skippedCount++;
      }
    }

    console.log(`✓ 재배치된 트랙: ${relocatedCount}개`);
    if (skippedCount > 0) {
      console.log(`✓ 재배치 스킵된 트랙: ${skippedCount}개`);
    }
    console.log("ℹ️  기존 그룹은 삭제하지 않고 남겨둡니다 (고아 그룹 허용).\n");
  }

  if (createdOrUsedGroupIds.length > 0) {
    console.log("Step 8: Primary track 설정 중 ...");

    const uniqueGroupIds = Array.from(new Set(createdOrUsedGroupIds));
    let primaryUpdateCount = 0;

    for (const groupId of uniqueGroupIds) {
      // 해당 그룹의 모든 트랙 조회
      const tracks = await prisma.spotifyTrack.findMany({
        where: { groupId },
        select: {
          id: true,
          popularity: true,
          releaseDate: true,
        },
      });

      if (tracks.length === 0) continue;

      // Popularity 높은 순, 같으면 최신 순, 같으면 id 작은 순
      const primary = tracks.slice().sort((a, b) => {
        const pa = popularityScore(a.popularity);
        const pb = popularityScore(b.popularity);
        if (pa !== pb) return pb - pa;

        // releaseDate 비교 (최신이 먼저, null은 뒤로)
        if (a.releaseDate && b.releaseDate) {
          return b.releaseDate.localeCompare(a.releaseDate);
        }
        if (a.releaseDate && !b.releaseDate) return -1;
        if (!a.releaseDate && b.releaseDate) return 1;

        return a.id - b.id;
      })[0]!;

      await prisma.spotifyTrackGroup.update({
        where: { id: groupId },
        data: { primarySpotifyTrackId: primary.id },
      });
      primaryUpdateCount++;
    }

    console.log(`✓ primary 설정된 그룹: ${primaryUpdateCount}개\n`);
  }

  console.log(
    "\n✅ 완료: SpotifyTrackGroup 생성 및 트랙 그룹화가 완료되었습니다.",
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
