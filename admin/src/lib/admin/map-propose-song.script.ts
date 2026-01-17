import "dotenv/config";
import { parseArgs } from "node:util";
import { mapProposeSong } from "./map-propose-song";
import { MapProposeSongResult } from "./map-propose-song";
import { prisma } from "../prisma";
import { MAX_ARTIST } from "./z-param";

// map-propose-song.ts를 CLI에서 실행하는 스크립트
// pnpm ts-node src/lib/admin/map-propose-song.script.ts <artistId>
// pnpm ts-node src/lib/admin/map-propose-song.script.ts --dry-run

interface CliArguments {
  artistId?: number;
  dryRun: boolean;
}

function printUsage() {
  console.log(`Usage:
  pnpm --filter admin ts-node src/lib/admin/map-propose-song.script.ts [artistId] [--dry-run]

Options:
  --dry-run   DB 업데이트 없이 매칭 결과만 확인
  --help      이 도움말 표시
`);
}

function parseCliArguments(): CliArguments {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  if (positionals.length > 1) {
    console.error("artistId는 0개 또는 1개만 전달할 수 있습니다.\n");
    printUsage();
    process.exit(1);
  }

  const artistIdRaw = positionals[0];
  let artistId: number | undefined;

  if (artistIdRaw !== undefined) {
    artistId = Number(artistIdRaw);
    if (!Number.isInteger(artistId) || artistId <= 0) {
      console.error(`유효하지 않은 artistId: ${artistIdRaw}\n`);
      printUsage();
      process.exit(1);
    }
  }

  return {
    artistId,
    dryRun: Boolean(values["dry-run"]),
  };
}

function logResult(result: MapProposeSongResult) {
  console.log(`\n=== Map propose song result ===`);
  console.log(
    `Artist: #${result.artistId} ${result.artistName} (tjNames: ${result.tjNames.join(", ") || "없음"})`,
  );
  console.log(
    `Songs: ${result.songCount}개, Proposes: ${result.proposeCount}개, Mappings: ${result.mappings.length}개`,
  );
  console.log(
    `Stats → matched: ${result.stats.matched}, candidates: ${result.stats.withCandidates}, noMatch: ${result.stats.noMatch}, updated: ${result.stats.updated}, failed: ${result.stats.failed}`,
  );

  const previewLimit = 5;
  if (result.mappings.length === 0) {
    console.log("  (매핑 결과 없음)");
    return;
  }

  console.log(`\n샘플 매핑 (최대 ${previewLimit}건):`);
  result.mappings.slice(0, previewLimit).forEach((mapping) => {
    const prefix = `  [Propose #${mapping.propose.id}] "${mapping.propose.songTitle}"`;
    if (mapping.matchedSong) {
      console.log(
        `${prefix} → [Song #${mapping.matchedSong.id}] "${mapping.matchedSong.title}" (${mapping.matchedSong.matchedBy})`,
      );
      return;
    }

    if (mapping.candidates.length > 0) {
      console.log(
        `${prefix} → 후보 ${mapping.candidates.length}개 (예: ${mapping.candidates[0].title})`,
      );
    } else {
      console.log(`${prefix} → 매칭 실패`);
    }
  });

  if (result.mappings.length > previewLimit) {
    console.log(`\n... 외 ${result.mappings.length - previewLimit}건`);
  }
}

async function runForSingleArtist(artistId: number, dryRun: boolean) {
  console.log(
    `\n🚀 mapProposeSong 실행: artistId=${artistId} ${dryRun ? "(dry-run)" : ""} (verbose)`,
  );

  const result = await mapProposeSong(artistId, { dryRun, verbose: true });
  logResult(result);
}

async function runForArtistRange(dryRun: boolean) {
  console.log(
    `\n🚀 mapProposeSong 일괄 실행: artistId <= ${MAX_ARTIST} ${dryRun ? "(dry-run)" : ""} (verbose)`,
  );

  const artists = await prisma.artist.findMany({
    where: { id: { lte: MAX_ARTIST } },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });

  if (artists.length === 0) {
    console.log("대상 아티스트가 없습니다.");
    return;
  }

  console.log(`대상 아티스트 ${artists.length}명 처리 시작\n`);

  let success = 0;
  let failed = 0;

  for (const artist of artists) {
    console.log(
      `\n--- [Artist #${artist.id}] ${artist.name ?? "(이름 없음)"} ---`,
    );
    try {
      await runForSingleArtist(artist.id, dryRun);
      success++;
    } catch (error) {
      failed++;
      console.error(`❌ Artist #${artist.id} 처리 실패:`, error);
    }
  }

  console.log(
    `\n📊 일괄 처리 완료 → 성공: ${success}, 실패: ${failed}, 총 대상: ${artists.length}`,
  );
}

async function main() {
  const { artistId, dryRun } = parseCliArguments();

  if (artistId) {
    await runForSingleArtist(artistId, dryRun);
  } else {
    await runForArtistRange(dryRun);
  }
}

main()
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 실패:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
