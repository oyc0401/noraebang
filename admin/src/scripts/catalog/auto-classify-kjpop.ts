import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

/**
 * 아티스트/곡 KPOP·JPOP 자동 분류 스크립트.
 * - 분류가 비어 있는 아티스트만 대상으로 삼고, 이름과 곡 카탈로그를 점수화하여 KPOP 또는 JPOP을 제안합니다.
 * - --dry-run 으로 변경 대상 목록만 확인하고, --apply 시 아티스트와 모든 곡 catalog를 일괄 업데이트합니다.
 *
 * 사용법:
 * pnpm ts-node src/scripts/catalog/auto-classify-kjpop.ts --dry-run --limit=20
 * pnpm ts-node src/scripts/catalog/auto-classify-kjpop.ts --apply --limit=20
 */

// TJ 아티스트/곡 데이터를 분석해 homeCatalog를 자동으로 KPOP/JPOP으로 분류하고 필요한 경우 곡 카탈로그도 일괄 변경하는 스크립트입니다.
// - 기본적으로 한글/일본어 여부와 기존 곡 카탈로그를 점수화해 제안합니다.
// - `--dry-run` 으로 제안 목록만 조회하고, `--apply` 로 실제 update를 실행합니다.
// - `--limit=N` 으로 dry-run 결과 출력 개수를 제한할 수 있습니다.
// pnpm ts-node src/scripts/catalog/auto-classify-kjpop.ts --dry-run
// pnpm ts-node src/scripts/catalog/auto-classify-kjpop.ts --dry-run --limit=50
// pnpm ts-node src/scripts/catalog/auto-classify-kjpop.ts --apply

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

type TargetCatalog = "KPOP" | "JPOP";

const HANGUL_REGEX = /[\uAC00-\uD7AF]/;
const HIRAGANA_REGEX = /[\u3040-\u309F]/;
const KATAKANA_REGEX = /[\u30A0-\u30FF]/;

interface ArtistCandidate {
  id: number;
  name: string;
  nameKo: string;
  currentCatalog: string | null;
  suggestedCatalog: TargetCatalog;
  scores: Record<TargetCatalog, number>;
  reasons: string[];
}

function analyzeArtist(artist: {
  id: number;
  name: string;
  nameKo: string;
  homeCatalog: string | null;
  artistSongs: {
    song: {
      id: number;
      catalog: string | null;
      title: string;
      titleKo: string | null;
    };
  }[];
}): ArtistCandidate | null {
  const scores: Record<TargetCatalog, number> = { KPOP: 0, JPOP: 0 };
  const reasons: string[] = [];

  // Name heuristics
  if (artist.name && HANGUL_REGEX.test(artist.name)) {
    scores.KPOP += 3;
    reasons.push("이름에 한글 포함 (+3)");
  }

  const hasJapaneseChar =
    artist.name &&
    (HIRAGANA_REGEX.test(artist.name) || KATAKANA_REGEX.test(artist.name));
  if (hasJapaneseChar) {
    scores.JPOP += 3;
    reasons.push("이름에 일본어(히라가나/가타카나) 포함 (+3)");
  }

  // Song title heuristics
  let kpopTitleMatches = 0;
  let jpopTitleMatches = 0;

  const rawSongScores: Record<TargetCatalog, number>[] = [];

  for (const songRelation of artist.artistSongs) {
    const titleSource = `${songRelation.song.title ?? ""} ${
      songRelation.song.titleKo ?? ""
    }`;
    let songKScore = 0;
    let songJScore = 0;

    if (titleSource && HANGUL_REGEX.test(titleSource)) {
      kpopTitleMatches += 1;
      songKScore += 1;
    }
    if (
      titleSource &&
      (HIRAGANA_REGEX.test(titleSource) || KATAKANA_REGEX.test(titleSource))
    ) {
      jpopTitleMatches += 1;
      songJScore += 1;
    }

    rawSongScores.push({ KPOP: songKScore, JPOP: songJScore });
  }

  if (kpopTitleMatches > 0) {
    scores.KPOP += kpopTitleMatches;
    reasons.push(`곡 제목에 한글 ${kpopTitleMatches}건 (+${kpopTitleMatches})`);
  }

  if (jpopTitleMatches > 0) {
    scores.JPOP += jpopTitleMatches;
    reasons.push(
      `곡 제목에 일본어 ${jpopTitleMatches}건 (+${jpopTitleMatches})`,
    );
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topKey, topScore] = sorted[0]!;
  const [, secondScore] = sorted[1]!;

  // Require a reasonable confidence gap and non-zero evidence
  if (topScore === 0) return null;
  if (topScore - secondScore < 2) return null;

  // Anomaly check: detect conflicting songs
  const majorityCatalog = topKey as TargetCatalog;
  const minorityCatalog = majorityCatalog === "KPOP" ? "JPOP" : "KPOP";
  const minorityStrongSongs = rawSongScores.filter(
    (songScore) =>
      songScore[minorityCatalog] > 0 && songScore[majorityCatalog] === 0,
  ).length;

  if (minorityStrongSongs > 0) {
    reasons.push(
      `⚠️ ${minorityCatalog} 제목 증거 ${minorityStrongSongs}건 → 분류 보류`,
    );
    return null;
  }

  const suggestedCatalog = topKey as TargetCatalog;

  if (artist.homeCatalog === suggestedCatalog) {
    return null;
  }

  return {
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    currentCatalog: artist.homeCatalog,
    suggestedCatalog,
    scores,
    reasons,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limitValue = limitArg
    ? Number.parseInt(limitArg.replace("--limit=", ""), 10)
    : undefined;
  const previewLimit = limitValue ?? 100;

  if (!apply && !dryRun) {
    console.error(
      "에러: --dry-run 또는 --apply 옵션 중 하나를 반드시 지정해야 합니다.",
    );
    process.exit(1);
  }

  const artists = await prisma.artist.findMany({
    where: {
      homeCatalog: null,
    },
    include: {
      artistSongs: {
        select: {
          song: {
            select: {
              id: true,
              catalog: true,
              title: true,
              titleKo: true,
            },
          },
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const candidates: ArtistCandidate[] = [];

  for (const artist of artists) {
    const analyzed = analyzeArtist(artist);
    if (analyzed) {
      candidates.push(analyzed);
    }
  }

  if (candidates.length === 0) {
    console.log("변경할 아티스트를 찾지 못했습니다.");
    return;
  }

  if (dryRun) {
    console.log("=== DRY RUN ===");
    console.log(
      `총 ${candidates.length}명의 아티스트가 변경 대상입니다. (--apply 옵션으로 실제 적용)`,
    );
    candidates.slice(0, previewLimit).forEach((candidate, index) => {
      console.log(
        `#${candidate.id} ${candidate.nameKo} / ${candidate.name} :: ${
          candidate.currentCatalog ?? "미지정"
        } -> ${candidate.suggestedCatalog} (점수 K:${candidate.scores.KPOP} / J:${candidate.scores.JPOP})`,
      );
      console.log(`  사유: ${candidate.reasons.join(" | ")}`);
    });
    if (candidates.length > previewLimit) {
      console.log(
        `... 외 ${candidates.length - previewLimit}명 ( --limit=N 으로 미리보기 개수 조절 가능 )`,
      );
    }
    return;
  }

  console.log("=== APPLYING CHANGES ===");
  const applyTargets =
    typeof limitValue === "number"
      ? candidates.slice(0, limitValue)
      : candidates;
  if (applyTargets.length === 0) {
    console.log("적용할 대상이 없습니다. (--limit 값이 너무 작을 수 있습니다)");
    return;
  }
  if (applyTargets.length < candidates.length) {
    console.log(
      `전체 ${candidates.length}명 중 ${applyTargets.length}명만 --limit ${
        limitValue ?? ""
      }에 따라 업데이트합니다.`,
    );
  }

  for (const candidate of applyTargets) {
    const { id, suggestedCatalog } = candidate;
    const artistUpdate = prisma.artist.update({
      where: { id },
      data: { homeCatalog: suggestedCatalog },
    });
    const songUpdate = prisma.song.updateMany({
      where: {
        artistSongs: {
          some: { artistId: id },
        },
      },
      data: {
        catalog: suggestedCatalog,
      },
    });

    const [, songResult] = await prisma.$transaction([
      artistUpdate,
      songUpdate,
    ]);
    console.log(
      `#${id} ${candidate.nameKo} -> ${suggestedCatalog}, 관련 곡 ${songResult.count}곡 업데이트`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
