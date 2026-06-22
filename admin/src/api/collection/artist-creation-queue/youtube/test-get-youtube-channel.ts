/**
 * ArtistCreationQueue YouTube channel lookup manual test.
 *
 * Usage:
 * cd admin
 * pnpm tsx src/api/artist-creation-queue/youtube/test-get-youtube-channel.ts
 *
 * Edit artistName below before running.
 */
import "dotenv/config";
import { getYoutubeChannel } from ".";

const artistName = "GUMI";

async function main() {
  const result = await getYoutubeChannel(artistName);

  console.log(JSON.stringify({ artistName, result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
