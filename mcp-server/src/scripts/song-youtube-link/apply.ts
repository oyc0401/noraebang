import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { disconnect } from "../../prisma.js";
import { applyMapping, type MappingPayload, type MappingItem } from "../../tools/song-mapper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PENDING_FILE = path.join(__dirname, "../../../output/song-youtube-link/pending-mappings.json");
const APPLIED_FILE = path.join(__dirname, "../../../output/song-youtube-link/applied-mappings.json");

interface PendingMappings {
  createdAt: string;
  results: MappingPayload[];
}

interface AppliedMappings {
  appliedAt: string;
  results: Array<{
    artistId: number;
    artistName?: string;
    mappedCount: number;
    skippedCount: number;
  }>;
}

/**
 * 결과 검증
 * - videoId가 3개 이상 중복 → 전체 제외 (null 반환)
 * - songId, videoId 중복 → 첫 번째만 유지
 */
function validateResult(result: MappingPayload): { valid: MappingPayload | null; rejected: MappingItem[] } {
  const rejected: MappingItem[] = [];

  // videoId 중복 횟수 체크
  const videoIdCount = new Map<string, number>();
  for (const item of result.song) {
    videoIdCount.set(item.videoId, (videoIdCount.get(item.videoId) ?? 0) + 1);
  }

  // 같은 videoId가 3개 이상이면 전체 제외
  for (const [videoId, count] of videoIdCount) {
    if (count >= 3) {
      console.log(`  ❌ videoId "${videoId}"가 ${count}개 곡에 중복 → 전체 보류`);
      return { valid: null, rejected: result.song };
    }
  }

  // songId, videoId 중복 제거
  const seenSongIds = new Set<number>();
  const seenVideoIds = new Set<string>();
  const cleanedSongs: MappingItem[] = [];

  for (const item of result.song) {
    if (seenSongIds.has(item.songId)) {
      console.log(`  ⚠️ songId ${item.songId} 중복 → 보류`);
      rejected.push(item);
      continue;
    }
    if (seenVideoIds.has(item.videoId)) {
      console.log(`  ⚠️ videoId "${item.videoId}" 중복 → 보류`);
      rejected.push(item);
      continue;
    }
    seenSongIds.add(item.songId);
    seenVideoIds.add(item.videoId);
    cleanedSongs.push(item);
  }

  if (cleanedSongs.length === 0) {
    return { valid: null, rejected };
  }

  return {
    valid: { ...result, song: cleanedSongs },
    rejected,
  };
}

async function main() {
  console.log("========== 매핑 적용 시작 ==========\n");

  // 1. pending 파일 읽기
  let pending: PendingMappings;
  try {
    const content = await readFile(PENDING_FILE, "utf-8");
    pending = JSON.parse(content);
  } catch {
    console.error("❌ pending-mappings.json 파일이 없습니다.");
    console.error("   먼저 pnpm batch 를 실행하세요.");
    process.exit(1);
  }

  if (pending.results.length === 0) {
    console.log("적용할 매핑이 없습니다.");
    return;
  }

  const totalMappings = pending.results.reduce((sum, r) => sum + r.song.length, 0);
  console.log(`대기 중인 매핑: ${pending.results.length}개 아티스트, ${totalMappings}개 곡\n`);

  // 2. 각 아티스트별로 검증 후 적용
  const appliedResults: AppliedMappings = {
    appliedAt: new Date().toISOString(),
    results: [],
  };

  const remainingResults: MappingPayload[] = []; // 검증 실패해서 남겨둘 것들
  let totalMapped = 0;
  let totalSkipped = 0;
  let totalRejected = 0;

  for (const payload of pending.results) {
    const artistLabel = payload.artistName
      ? `Artist ${payload.artistId} (${payload.artistName})`
      : `Artist ${payload.artistId}`;

    console.log(`${artistLabel}: ${payload.song.length}개 매핑 검증 중...`);

    // 검증
    const { valid, rejected } = validateResult(payload);

    if (rejected.length > 0) {
      totalRejected += rejected.length;
    }

    if (!valid) {
      // 전체 보류 → pending에 남겨둠
      remainingResults.push(payload);
      console.log(`  → 전체 보류 (${payload.song.length}개)`);
      continue;
    }

    // 일부만 통과한 경우, 보류된 것들은 남겨둠
    if (rejected.length > 0) {
      remainingResults.push({
        artistId: payload.artistId,
        artistName: payload.artistName,
        song: rejected,
      });
    }

    // DB에 적용
    console.log(`  → ${valid.song.length}개 적용 중...`);
    const result = await applyMapping(valid);

    console.log(`  → ${result.mappedCount}개 성공, ${result.skippedCount}개 스킵 (이미 존재)`);

    appliedResults.results.push({
      artistId: payload.artistId,
      artistName: payload.artistName,
      mappedCount: result.mappedCount,
      skippedCount: result.skippedCount,
    });

    totalMapped += result.mappedCount;
    totalSkipped += result.skippedCount;
  }

  // 3. 결과 저장
  const dir = path.dirname(APPLIED_FILE);
  await import("node:fs/promises").then((fs) => fs.mkdir(dir, { recursive: true }));
  await writeFile(APPLIED_FILE, JSON.stringify(appliedResults, null, 2), "utf-8");

  // 4. pending 파일 업데이트 (보류된 것만 남김)
  await writeFile(
    PENDING_FILE,
    JSON.stringify({ createdAt: pending.createdAt, results: remainingResults }, null, 2),
    "utf-8"
  );

  console.log(`\n========== 적용 완료 ==========`);
  console.log(`적용 성공: ${totalMapped}개`);
  console.log(`이미 존재: ${totalSkipped}개`);
  console.log(`검증 실패 (보류): ${totalRejected}개`);
  console.log(`\n남은 pending: ${remainingResults.length}개 아티스트`);
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });
