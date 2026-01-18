import "dotenv/config";

import { mapSongSpotifyGroups } from "../../../lib/admin/map-song-spotify-groups";
import { prisma } from "../../../lib/prisma";

function parseArgs() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isForce = args.includes("--force");

  let start = 1;
  let end = 300;

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
  const result = await mapSongSpotifyGroups({
    minArtistId: start,
    maxArtistId: end,
    dryRun: isDryRun,
    force: isForce,
    logger: console.log,
  });

  console.log("\n📊 Summary");
  console.log(
    `  artists processed: ${result.processedArtists} (range ${result.minArtistId}~${result.maxArtistId})`,
  );
  console.log(`  songs mapped: ${result.stats.mappedSongs}`);
  console.log(
    `  artists skipped(no data): ${result.stats.artistSkippedNoData}`,
  );
  console.log(
    `  songs skipped(already linked): ${result.stats.songSkippedAlreadyLinked}`,
  );
  console.log(`  errors: ${result.stats.errors}`);
}

main()
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
