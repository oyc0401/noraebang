import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma, disconnect } from "../../prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PENDING_FILE = path.join(__dirname, "../../../output/song-title-check/pending-fixes.json");

interface SongFix {
  songId: number;
  title?: string;
  originalTitleKo?: string;
  originalTitleJa?: string;
  originalTitleLatin?: string;
  titleKo?: string | null;
  titleJa?: string | null;
  titleLatin?: string | null;
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

async function main() {
  console.log("pending-fixes.json에 원본 정보 추가 중...\n");

  const content = await readFile(PENDING_FILE, "utf-8");
  const data: PendingFixes = JSON.parse(content);

  let enrichedCount = 0;

  for (const artistFix of data.results) {
    for (const fix of artistFix.fixes) {
      // 이미 title이 있으면 스킵
      if (fix.title) continue;

      const song = await prisma.song.findUnique({
        where: { id: fix.songId },
        select: {
          title: true,
          titleKo: true,
          titleJa: true,
          titleLatin: true,
        },
      });

      if (!song) {
        console.log(`  ⚠️ songId ${fix.songId}: 찾을 수 없음`);
        continue;
      }

      // 순서 유지를 위해 새 객체 생성
      const enrichedFix: SongFix = {
        songId: fix.songId,
        title: song.title,
      };

      // 수정 대상 필드의 원본 값 추가
      if (fix.titleKo !== undefined && song.titleKo) {
        enrichedFix.originalTitleKo = song.titleKo;
      }
      if (fix.titleJa !== undefined && song.titleJa) {
        enrichedFix.originalTitleJa = song.titleJa;
      }
      if (fix.titleLatin !== undefined && song.titleLatin) {
        enrichedFix.originalTitleLatin = song.titleLatin;
      }

      // 수정할 값 추가 (빈 문자열은 null로 변환)
      if (fix.titleKo !== undefined) enrichedFix.titleKo = fix.titleKo === "" ? null : fix.titleKo;
      if (fix.titleJa !== undefined) enrichedFix.titleJa = fix.titleJa === "" ? null : fix.titleJa;
      if (fix.titleLatin !== undefined) enrichedFix.titleLatin = fix.titleLatin === "" ? null : fix.titleLatin;

      // 원본 fix 객체 업데이트
      Object.keys(fix).forEach((key) => delete (fix as Record<string, unknown>)[key]);
      Object.assign(fix, enrichedFix);

      enrichedCount++;
      console.log(`  ✓ songId ${fix.songId}: "${song.title}" 추가`);
    }
  }

  await writeFile(PENDING_FILE, JSON.stringify(data, null, 2), "utf-8");

  console.log(`\n완료! ${enrichedCount}개 곡에 원본 정보 추가됨`);
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });
