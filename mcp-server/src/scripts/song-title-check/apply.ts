import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma, disconnect } from "../../prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PENDING_FILE = path.join(__dirname, "../../../output/song-title-check/pending-fixes.json");
const APPLIED_FILE = path.join(__dirname, "../../../output/song-title-check/applied-fixes.json");

interface SongFix {
  songId: number;
  titleKo?: string;
  titleJa?: string;
  titleLatin?: string;
}

interface ArtistFix {
  artistId: number;
  artistName: string;
  fixes: SongFix[];
}

interface PendingFixes {
  createdAt: string;
  results: ArtistFix[];
}

interface AppliedFixes {
  appliedAt: string;
  results: Array<{
    artistId: number;
    artistName: string;
    fixedCount: number;
    skippedCount: number;
  }>;
}

async function applySongFix(fix: SongFix): Promise<boolean> {
  const updateData: Record<string, string | null> = {};

  // titleKo는 사람이 직접 입력한 거라 수정 안 함
  // if (fix.titleKo !== undefined) updateData.titleKo = fix.titleKo || null;
  if (fix.titleJa !== undefined) updateData.titleJa = fix.titleJa === "" ? null : fix.titleJa;
  if (fix.titleLatin !== undefined) updateData.titleLatin = fix.titleLatin === "" ? null : fix.titleLatin;

  if (Object.keys(updateData).length === 0) {
    return false;
  }

  await prisma.song.update({
    where: { id: fix.songId },
    data: updateData,
  });

  return true;
}

async function main() {
  console.log("========== 타이틀 수정 적용 시작 ==========\n");

  // 1. pending 파일 읽기
  let pending: PendingFixes;
  try {
    const content = await readFile(PENDING_FILE, "utf-8");
    pending = JSON.parse(content);
  } catch {
    console.error("❌ pending-fixes.json 파일이 없습니다.");
    console.error("   먼저 pnpm stc:batch 를 실행하세요.");
    process.exit(1);
  }

  if (pending.results.length === 0) {
    console.log("적용할 수정이 없습니다.");
    return;
  }

  const totalFixes = pending.results.reduce((sum, r) => sum + r.fixes.length, 0);
  console.log(`대기 중인 수정: ${pending.results.length}개 아티스트, ${totalFixes}개 곡\n`);

  // 2. 각 아티스트별로 적용
  const appliedResults: AppliedFixes = {
    appliedAt: new Date().toISOString(),
    results: [],
  };

  let totalFixed = 0;
  let totalSkipped = 0;

  for (const artistFix of pending.results) {
    const artistLabel = `Artist ${artistFix.artistId} (${artistFix.artistName})`;
    console.log(`${artistLabel}: ${artistFix.fixes.length}개 수정 적용 중...`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const fix of artistFix.fixes) {
      try {
        const applied = await applySongFix(fix);
        if (applied) {
          const fields = [fix.titleKo && "titleKo", fix.titleJa && "titleJa", fix.titleLatin && "titleLatin"].filter(Boolean).join(", ");
          console.log(`  ✓ songId ${fix.songId}: ${fields} 수정`);
          fixedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`  ✗ songId ${fix.songId}: 오류 -`, error);
        skippedCount++;
      }
    }

    console.log(`  → ${fixedCount}개 수정, ${skippedCount}개 스킵`);

    appliedResults.results.push({
      artistId: artistFix.artistId,
      artistName: artistFix.artistName,
      fixedCount,
      skippedCount,
    });

    totalFixed += fixedCount;
    totalSkipped += skippedCount;
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
  console.log(`수정 성공: ${totalFixed}개`);
  console.log(`스킵: ${totalSkipped}개`);
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });
