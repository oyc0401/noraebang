/**
 * ArtistCreationQueue Brave Search raw response manual test.
 *
 * Env:
 * admin/.env
 * BRAVE_SEARCH_API_KEY=...
 *
 * Usage:
 * cd admin
 * pnpm tsx src/api/artist-creation-queue/name-generater/test-brave-search-raw.ts
 *
 * Edit artistName and tjsongTitle below before running.
 */
import "dotenv/config";
import { searchBraveRaw } from "../../../../lib/brave-search";

const artistName = "GUMI";
const tjsongTitle = "天ノ弱";

async function main() {
  void tjsongTitle;

  const query = `${artistName} jpop가수 한국어 이름`;
  const result = await searchBraveRaw(query);

  console.log(JSON.stringify({ query, result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
