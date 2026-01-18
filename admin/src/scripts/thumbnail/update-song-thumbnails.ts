import "dotenv/config";

import { updateSongThumbnails } from "../../lib/admin/update-song-thumbnails";
import { prisma } from "../../lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const startArg = args.find((item) => item.startsWith("--start="));
  const endArg = args.find((item) => item.startsWith("--end="));
  const dryRun = args.includes("--dry-run");

  const minArtistId = startArg ? Number(startArg.split("=")[1]) : 1;
  const maxArtistId = endArg ? Number(endArg.split("=")[1]) : 300;

  if (!Number.isFinite(minArtistId) || !Number.isFinite(maxArtistId)) {
    console.error("❌ start/end 값을 확인하세요.");
    process.exit(1);
  }

  const result = await updateSongThumbnails(
    { minArtistId, maxArtistId },
    { dryRun, verbose: true },
  );

  console.log("\n📊 Summary");
  console.log(
    `  artistId ${result.minArtistId}~${result.maxArtistId} (${result.totalSongs}곡)`,
  );
  console.log(`  updated: ${result.stats.updated}`);
  console.log(`  spotify oldest: ${result.stats.updatedBySpotifyOldest}`);
  console.log(`  youtube: ${result.stats.updatedByYoutube}`);
  console.log(`  unchanged: ${result.stats.unchanged}`);
  console.log(`  skipped(no source): ${result.stats.skippedNoSource}`);
}

main()
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
