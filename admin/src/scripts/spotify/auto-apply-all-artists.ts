/**
 * 전체 아티스트에 대해 Song-SpotifyTrack 매핑 자동화
 *
 * 로직:
 * 1. artistId 1번부터 272번까지 순회
 * 2. generate-song-spotify-mapping.ts 실행 → artist-mapping.json, artist-mapping-stats.json 생성
 * 3. stats 파일에서 totalSongs와 tracksWithAnswer 비교
 * 4. 일치하면 apply-song-spotify-mapping.ts 실행 (자동 매핑)
 * 5. 불일치하면 스킵 (수동 확인 필요) - 단, --force 옵션 사용시 무조건 적용
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/auto-apply-all-artists.ts
 * pnpm ts-node src/scripts/spotify/auto-apply-all-artists.ts --dry-run
 * pnpm ts-node src/scripts/spotify/auto-apply-all-artists.ts --start 1 --end 50
 * pnpm ts-node src/scripts/spotify/auto-apply-all-artists.ts --start 1 --end 50 --dry-run
 * pnpm ts-node src/scripts/spotify/auto-apply-all-artists.ts --force (매칭 여부 상관없이 무조건 적용)
 * pnpm ts-node src/scripts/spotify/auto-apply-all-artists.ts --start 1 --end 50 --force
 */

import { execSync } from "node:child_process";
import fs from "node:fs";

interface Stats {
  artist: {
    id: number;
    name: string;
    nameKo: string;
  };
  totalSongs: number;
  totalSpotifyTracks: number;
  stats: {
    tracksWithAnswer: number;
    tracksWithCandidatesOnly: number;
    tracksWithoutMatches: number;
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isForce = args.includes("--force");

  let start = 1;
  let end = 272;

  const startIdx = args.indexOf("--start");
  if (startIdx !== -1 && args[startIdx + 1]) {
    start = Number.parseInt(args[startIdx + 1], 10);
  }

  const endIdx = args.indexOf("--end");
  if (endIdx !== -1 && args[endIdx + 1]) {
    end = Number.parseInt(args[endIdx + 1], 10);
  }

  return { start, end, isDryRun, isForce };
}

async function main() {
  const { start, end, isDryRun, isForce } = parseArgs();

  console.log("🚀 Auto-applying Song-SpotifyTrack mappings");
  console.log(`📊 Artist range: ${start} ~ ${end}`);
  if (isDryRun) {
    console.log("🔍 DRY RUN MODE - No database changes will be made");
  }
  if (isForce) {
    console.log("⚡ FORCE MODE - Apply mappings regardless of match quality");
  }
  console.log("\n" + "=".repeat(70) + "\n");

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  let partialMatchCount = 0;

  const results: Array<{
    artistId: number;
    artistName: string;
    status: "success" | "skip" | "partial" | "error";
    reason?: string;
    totalSongs?: number;
    tracksWithAnswer?: number;
  }> = [];

  for (let artistId = start; artistId <= end; artistId++) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`🎤 Processing Artist ID: ${artistId}`);
    console.log("=".repeat(70));

    try {
      // Step 1: generate-song-spotify-mapping.ts 실행
      console.log("\n📝 Step 1: Generating mapping...");
      execSync(
        `pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts ${artistId}`,
        {
          cwd: process.cwd(),
          stdio: "inherit",
        },
      );

      // Step 2: stats 파일 읽기
      const statsPath = "artist-mapping-stats.json";
      if (!fs.existsSync(statsPath)) {
        console.error(`❌ Stats file not found: ${statsPath}`);
        results.push({
          artistId,
          artistName: "Unknown",
          status: "error",
          reason: "Stats file not found",
        });
        errorCount++;
        continue;
      }

      const stats: Stats = JSON.parse(fs.readFileSync(statsPath, "utf-8"));

      console.log("\n📊 Stats:");
      console.log(`  Artist: ${stats.artist.name} (${stats.artist.nameKo})`);
      console.log(`  Total Songs: ${stats.totalSongs}`);
      console.log(`  Total Spotify Tracks: ${stats.totalSpotifyTracks}`);
      console.log(`  Tracks with Answer: ${stats.stats.tracksWithAnswer}`);

      // Step 3: totalSongs와 tracksWithAnswer 비교
      if (stats.totalSongs === 0) {
        console.log("\n⏭️  SKIP: No songs for this artist");
        results.push({
          artistId,
          artistName: `${stats.artist.name} (${stats.artist.nameKo})`,
          status: "skip",
          reason: "No songs",
          totalSongs: stats.totalSongs,
          tracksWithAnswer: stats.stats.tracksWithAnswer,
        });
        skipCount++;
        continue;
      }

      if (stats.totalSpotifyTracks === 0) {
        console.log("\n⏭️  SKIP: No Spotify tracks for this artist");
        results.push({
          artistId,
          artistName: `${stats.artist.name} (${stats.artist.nameKo})`,
          status: "skip",
          reason: "No Spotify tracks",
          totalSongs: stats.totalSongs,
          tracksWithAnswer: stats.stats.tracksWithAnswer,
        });
        skipCount++;
        continue;
      }

      if (stats.totalSongs !== stats.stats.tracksWithAnswer) {
        if (!isForce) {
          console.log("\n⚠️  PARTIAL MATCH: totalSongs !== tracksWithAnswer");
          console.log(
            `   Expected: ${stats.totalSongs}, Got: ${stats.stats.tracksWithAnswer}`,
          );
          console.log("   → Skipping auto-apply (manual review needed)");
          results.push({
            artistId,
            artistName: `${stats.artist.name} (${stats.artist.nameKo})`,
            status: "partial",
            reason: `${stats.stats.tracksWithAnswer}/${stats.totalSongs} matched`,
            totalSongs: stats.totalSongs,
            tracksWithAnswer: stats.stats.tracksWithAnswer,
          });
          partialMatchCount++;
          continue;
        }
        console.log("\n⚠️  PARTIAL MATCH but FORCE MODE - Applying anyway...");
        console.log(
          `   Expected: ${stats.totalSongs}, Got: ${stats.stats.tracksWithAnswer}`,
        );
      } else {
        console.log("\n✅ PERFECT MATCH! Applying mapping...");
      }

      // Step 4: apply

      if (isDryRun) {
        console.log("[DRY RUN] Would execute: apply-song-spotify-mapping.ts");
      } else {
        execSync(
          "pnpm ts-node src/scripts/spotify/apply-song-spotify-mapping.ts",
          {
            cwd: process.cwd(),
            stdio: "inherit",
          },
        );
      }

      results.push({
        artistId,
        artistName: `${stats.artist.name} (${stats.artist.nameKo})`,
        status: "success",
        totalSongs: stats.totalSongs,
        tracksWithAnswer: stats.stats.tracksWithAnswer,
      });
      successCount++;
    } catch (error: any) {
      console.error(`\n❌ Error processing artist ${artistId}:`, error.message);
      results.push({
        artistId,
        artistName: "Unknown",
        status: "error",
        reason: error.message,
      });
      errorCount++;
    }
  }

  // 최종 요약
  console.log("\n\n" + "=".repeat(70));
  console.log("🎉 FINAL SUMMARY");
  console.log("=".repeat(70));
  console.log(`✅ Success (auto-applied): ${successCount}`);
  console.log(`⚠️  Partial match (skipped): ${partialMatchCount}`);
  console.log(`⏭️  Skipped (no data): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${end - start + 1}`);
  console.log("=".repeat(70) + "\n");

  // 상세 결과 출력
  console.log("📋 Detailed Results:\n");

  console.log("✅ Success:");
  results
    .filter((r) => r.status === "success")
    .forEach((r) => {
      console.log(
        `  ${r.artistId}. ${r.artistName} (${r.tracksWithAnswer}/${r.totalSongs})`,
      );
    });

  if (partialMatchCount > 0) {
    console.log("\n⚠️  Partial Match (manual review needed):");
    results
      .filter((r) => r.status === "partial")
      .forEach((r) => {
        console.log(`  ${r.artistId}. ${r.artistName} - ${r.reason}`);
      });
  }

  if (skipCount > 0) {
    console.log("\n⏭️  Skipped:");
    results
      .filter((r) => r.status === "skip")
      .forEach((r) => {
        console.log(`  ${r.artistId}. ${r.artistName} - ${r.reason}`);
      });
  }

  if (errorCount > 0) {
    console.log("\n❌ Errors:");
    results
      .filter((r) => r.status === "error")
      .forEach((r) => {
        console.log(`  ${r.artistId}. ${r.artistName} - ${r.reason}`);
      });
  }

  // 결과를 JSON 파일로 저장
  const resultPath = "auto-apply-results.json";
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Saved detailed results to ${resultPath}`);

  if (isDryRun) {
    console.log(
      "\n✨ Dry run complete! Run without --dry-run to apply changes.",
    );
  } else {
    console.log("\n✨ All done!");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
