/**
 * ArtistCreationQueue YouTube thumbnail lookup manual test.
 *
 * Usage:
 * cd admin
 * pnpm tsx src/api/artist-creation-queue/youtube/test-get-thumbnails.ts
 *
 * Edit youtubeChannelId below before running.
 */
import "dotenv/config";
import { getThumbnails } from ".";

const youtubeChannelId = "UCyWxjLVNaYG2f0rFi9MDngQ";

async function main() {
  const result = await getThumbnails(youtubeChannelId);

  console.log(JSON.stringify({ youtubeChannelId, result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
