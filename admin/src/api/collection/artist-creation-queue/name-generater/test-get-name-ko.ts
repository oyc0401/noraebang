/**
 * ArtistCreationQueue nameKo generation manual test.
 *
 * Env:
 * admin/.env
 * BRAVE_SEARCH_API_KEY=...
 * OPENAI_API_KEY=...
 *
 * Usage:
 * cd admin
 * pnpm tsx src/api/artist-creation-queue/name-generater/test-get-name-ko.ts
 *
 * Edit artistName below before running.
 */
import "dotenv/config";
import { getNameKo } from ".";

const artistName = "GUMI";

async function main() {
  const result = await getNameKo(artistName);

  console.log(JSON.stringify({ artistName, nameKo: result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
