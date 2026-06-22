/**
 * ArtistCreationQueue Spotify artist id lookup manual test.
 *
 * Usage:
 * cd admin
 * pnpm tsx src/api/artist-creation-queue/spotify/test-get-artist-id.ts
 *
 * Edit artistName below before running.
 */
import "dotenv/config";
import { getArtistId } from ".";

const artistName = "GUMI";

async function main() {
  const result = await getArtistId(artistName);

  console.log(JSON.stringify({ artistName, result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
