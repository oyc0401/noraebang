import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { disconnect } from "../prisma.js";
import { applyMapping, type MappingPayload } from "../tools/song-mapper.js";

const PENDING_FILE = path.join(import.meta.dirname, "../../output/pending-mappings.json");
const APPLIED_FILE = path.join(import.meta.dirname, "../../output/applied-mappings.json");

interface PendingMappings {
  createdAt: string;
  results: MappingPayload[];
}

interface AppliedMappings {
  appliedAt: string;
  results: Array<{
    artistId: number;
    mappedCount: number;
    skippedCount: number;
  }>;
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
  console.log(`대기 중인 매핑: ${pending.results.length}개 아티스트, ${totalMappings}개 곡`);
  console.log("");

  // 2. 각 아티스트별로 적용
  const appliedResults: AppliedMappings = {
    appliedAt: new Date().toISOString(),
    results: [],
  };

  let totalMapped = 0;
  let totalSkipped = 0;

  for (const payload of pending.results) {
    console.log(`Artist ${payload.artistId}: ${payload.song.length}개 매핑 적용 중...`);

    const result = await applyMapping(payload);

    console.log(`  → ${result.mappedCount}개 성공, ${result.skippedCount}개 스킵 (이미 존재)`);

    appliedResults.results.push({
      artistId: payload.artistId,
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

  // 4. pending 파일 비우기
  await writeFile(
    PENDING_FILE,
    JSON.stringify({ createdAt: new Date().toISOString(), results: [] }, null, 2),
    "utf-8"
  );

  console.log(`\n========== 적용 완료 ==========`);
  console.log(`총 ${totalMapped}개 매핑 성공, ${totalSkipped}개 스킵`);
  console.log(`결과 저장: ${APPLIED_FILE}`);
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });
