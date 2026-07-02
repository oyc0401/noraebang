/**
 * SongCreationQueue titleKo manual test.
 *
 * Env:
 * admin/.env
 * BRAVE_SEARCH_API_KEY=...
 * OPENAI_API_KEY=...
 *
 * Usage:
 * cd admin
 * pnpm tsx src/api/collection/song-creation-queue/title-generater/test-get-title-ko.ts
 *
 * Edit songTitle and artistName below before running.
 */
import "dotenv/config";
import { getTitleKo } from "./index";

const songTitle = "マリーゴールド";
const artistName = "あいみょん";

async function main() {
  const titleKo = await getTitleKo(songTitle, artistName);

  console.log(JSON.stringify({ songTitle, artistName, titleKo }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
