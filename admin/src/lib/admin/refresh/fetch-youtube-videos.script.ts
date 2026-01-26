/**
 * 지정한 ID 범위와 카탈로그 조건을 만족하는 아티스트들의 YouTube Topic 비디오를 일괄 수집합니다.
 *
 * 내부 로직은 fetchTopicVideosForArtist와 동일하며, CLI에서 간편하게 배치를 돌릴 수 있도록 래핑했습니다.
 *
 * 기본값: id 346~425, homeCatalog = JPOP
 *
 * 사용법:
 * pnpm ts-node src/lib/admin/refresh/fetch-youtube-videos.script.ts
 * pnpm ts-node src/lib/admin/refresh/fetch-youtube-videos.script.ts --dry-run
 * pnpm ts-node src/lib/admin/refresh/fetch-youtube-videos.script.ts --start=300 --end=15175 --catalog=JPOP
 */

import "dotenv/config";
import { prisma } from "../../prisma";
import { fetchTopicVideosForArtist } from "./fetch-youtube-videos";

// pnpm ts-node src/lib/admin/refresh/fetch-youtube-videos.script.ts
// pnpm ts-node src/lib/admin/refresh/fetch-youtube-videos.script.ts --dry-run
// pnpm ts-node src/lib/admin/refresh/fetch-youtube-videos.script.ts --start=3227 --end=15175 --catalog=JPOP

const DEFAULT_START_ID = 346;
const DEFAULT_END_ID = 425;
const DEFAULT_CATALOG = "JPOP";

interface ScriptOptions {
  startId: number;
  endId: number;
  catalog: string | null;
  dryRun: boolean;
}

interface ArtistSummary {
  id: number;
  name: string;
  nameKo: string | null;
}

function parseNumberArg(
  args: string[],
  flag: string,
  fallback: number,
): number {
  const entry = args.find((arg) => arg.startsWith(`${flag}=`));
  if (!entry) return fallback;

  const [, rawValue] = entry.split("=");
  const value = Number(rawValue);

  if (Number.isNaN(value)) {
    throw new Error(`Invalid ${flag} value: ${rawValue}`);
  }

  return value;
}

function parseStringArg(
  args: string[],
  flag: string,
  fallback: string | null,
): string | null {
  const entry = args.find((arg) => arg.startsWith(`${flag}=`));
  if (!entry) return fallback;

  const [, value] = entry.split("=");
  return value ? value.trim() : fallback;
}

function parseOptions(): ScriptOptions {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const startId = parseNumberArg(args, "--start", DEFAULT_START_ID);
  const endId = parseNumberArg(args, "--end", DEFAULT_END_ID);
  const catalogRaw = parseStringArg(args, "--catalog", DEFAULT_CATALOG);

  const catalog =
    catalogRaw && catalogRaw.toLowerCase() !== "all"
      ? catalogRaw.toUpperCase()
      : null;

  if (startId > endId) {
    throw new Error(`start (${startId})이 end (${endId})보다 큽니다.`);
  }

  return { startId, endId, catalog, dryRun };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const options = parseOptions();

  console.log("🎬 YouTube Topic 비디오 일괄 수집 스크립트");
  console.log(
    ` - 범위: ${options.startId} ~ ${options.endId}${
      options.catalog ? ` (${options.catalog})` : ""
    }`,
  );
  console.log(` - 모드: ${options.dryRun ? "DRY-RUN (DB 미반영)" : "실행"}`);

  const artists = await prisma.artist.findMany({
    where: {
      id: { gte: options.startId, lte: options.endId },
      ...(options.catalog ? { homeCatalog: options.catalog } : {}),
    },
    select: {
      id: true,
      name: true,
      nameKo: true,
    },
    orderBy: { id: "asc" },
  });

  if (artists.length === 0) {
    console.log("⚠️  조건에 맞는 아티스트가 없습니다.");
    return;
  }

  console.log(
    `\n총 ${artists.length}명의 아티스트가 선택되었습니다. 순차 처리합니다.\n`,
  );

  const failures: Array<{ artist: ArtistSummary; error: string }> = [];

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];
    console.log(
      `\n[${i + 1}/${artists.length}] ▶︎ #${artist.id} ${artist.name}${
        artist.nameKo ? ` (${artist.nameKo})` : ""
      }`,
    );

    try {
      await fetchTopicVideosForArtist(artist.id, {
        dryRun: options.dryRun,
      });
    } catch (error: any) {
      const message = error?.message ?? "알 수 없는 오류";
      failures.push({ artist, error: message });
      console.error(`  ❌ 실패: ${message}`);

      if (
        typeof message === "string" &&
        (message.includes("quota") || message.includes("403"))
      ) {
        console.error("  ⚠️  YouTube API 쿼터 문제로 조기 중단합니다.");
        break;
      }
    }

    if (i < artists.length - 1) {
      await delay(500);
    }
  }

  const successCount = artists.length - failures.length;
  console.log("\n📊 요약");
  console.log(` - 성공: ${successCount}명`);
  console.log(` - 실패: ${failures.length}명`);

  if (failures.length) {
    console.log("\n실패 목록:");
    failures.forEach(({ artist, error }) => {
      console.log(
        `  • #${artist.id} ${artist.name}${
          artist.nameKo ? ` (${artist.nameKo})` : ""
        }: ${error}`,
      );
    });
  }
}

main()
  .catch((error) => {
    console.error("❌ 실행 중 오류가 발생했습니다:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
